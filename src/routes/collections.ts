import { Request, Response, Router } from "express";
import zod, { number } from "zod"
import fs from "fs/promises"
import { AbiCoder, ethers, JsonRpcProvider } from "ethers";
import { prisma } from "../prisma";
import axios from "axios";
import multer from "multer"
import path from "path";
import { PinataSDK } from "pinata-web3";

const collectionRouter = Router()
const nftInitSchema = zod.object({
    name: zod.string(),
    symbol: zod.string()
})
const mintSchema = zod.object({
    creator: zod.string(),
    to: zod.string(),
    tokenUri: zod.string()
})
const transferAssetSchema = zod.object({
    to: zod.string(),
    tokenId: zod.number()
})
const BLOCKCHAIN_URL = process.env.BLOCK_CHAIN_URL as unknown as string
const contractCreationSchema = zod.object({
    name: zod.string(),
    symbol: zod.string()
})
const abiByteCodeFilePath = "./out/UserToken.sol/UserNFTToken.json"
const contractNamePath = "./src/contracts/UserToken.sol:UserNFTToken"
const flattenCodePath = "./src/flatten-contracts/UserToken.sol"
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads")
    },
    filename: (req, file, cb) =>{
        const ext = path.extname(file.originalname)
        const uniquestring = Date.now() + '-' + Math.round(Math.random()*1E9)
        cb(null,file.fieldname+uniquestring+ext)
    }
})
const upload = multer({
    storage: diskStorage
})
const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.PINATA_GATEWAY
})


async function deployContract(privateKey: string, contractData: zod.infer<typeof contractCreationSchema>): Promise<string> {
    const fileByteCode = await fs.readFile(abiByteCodeFilePath)
    const fileData = JSON.parse(fileByteCode.toString())
    const abi = fileData["abi"]
    const byteCode = fileData["bytecode"]["object"]
    const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_URL)
    const wallet = new ethers.Wallet(privateKey, provider)
    const constructorArgs = [contractData.name, contractData.symbol]
    const factory = new ethers.ContractFactory(abi, byteCode, wallet)
    const contract = await factory.deploy(...constructorArgs)
    const addressOfContract = await contract.getAddress()
    console.log(`contract address is ${addressOfContract}`)
    return addressOfContract
}

async function verifyContract(contractAddress: string, name: string, symbol: string) {
    const EtherScanAPI = process.env.ETHER_SCAN_URL as unknown as string
    const EtherScanAPIKEY = process.env.ETHER_SCAN_API_KEY as unknown as string
    const contractName = contractNamePath
    const sourceCode = (await fs.readFile(flattenCodePath)).toString()
    const compilerversion = "v0.8.28+commit.7893614a"
    const constructorArguemnts = AbiCoder.defaultAbiCoder().encode(["string memory", "string memory"], [name, symbol])
    console.log(`const argu ${constructorArguemnts}`)
    const data = {
        module: "contract",
        action: "verifysourcecode",
        apikey: EtherScanAPIKEY,
        chainId: process.env.BLOCK_CHAIN_ID,
        codeformat: "solidity-single-file",
        sourceCode: sourceCode,
        constructorArguments: constructorArguemnts,
        contractaddress: contractAddress,
        contractName: contractName,
        compilerversion: compilerversion,
    }
    const response = await axios.post(EtherScanAPI,null, {
        data
    })
    console.log(`verifying response`)
    console.log(response)
    return response.data
}

async function getContractForWriting(privateKey: string, contractAddress: string): Promise<ethers.Contract> {
    const rpcProvider = new JsonRpcProvider(BLOCKCHAIN_URL)
    const rawabiByteCode = await fs.readFile(abiByteCodeFilePath)
    const parsedABI = JSON.parse(rawabiByteCode.toString())
    const wallet = new ethers.Wallet(privateKey, rpcProvider)
    const contract = new ethers.Contract(contractAddress, parsedABI['abi'], wallet)
    return contract
}

async function getContractForReading(contractAddress: string): Promise<ethers.Contract> {
    const rpcProvider = new JsonRpcProvider(BLOCKCHAIN_URL)
    const rawabiByteCode = await fs.readFile(abiByteCodeFilePath)
    const parsedABI = JSON.parse(rawabiByteCode.toString())
    const contract = new ethers.Contract(contractAddress, parsedABI['abi'], rpcProvider)
    return contract
}

//Create a new collection and makes the user as owner of the collection
collectionRouter.post("/create", async (req, res)=>{
    const data = contractCreationSchema.safeParse(req.body)
    if (data.success) {
        try {
            //First check if the enough gas fees is present
            const deloyedContractAddress = await deployContract(req.user.privatekey as unknown as string, data.data)
            await prisma.collectionOwners.create({
                data: {
                    ownerId: req.user.id,
                    collectionAddress: deloyedContractAddress
                }
            })
            //const verifyCOntract = await verifyContract(deloyedContractAddress, data.data.name, data.data.symbol)
            res.status(201).send({
                contract: deloyedContractAddress
            })
        } catch (e) {
            console.log(e)
            res.status(500).send({
                message: "Unbale to create a contract"
            })
        }
    } else {
        res.status(400).send({
            message: "Bad Request"
        })
    }
})


//get all collections owned by the user and was created by the app
collectionRouter.get("/",async (req, res)=>{
    try {
        const collections = await prisma.collectionOwners.findMany({
            where: {
                ownerId: req.user.id
            },
            select: {
                collectionAddress: true
            }
        })
        res.status(200).send({
            collections: collections
        })
    } catch (e) {
        console.log(e)
        res.status(500).send({
            message: "Internal Server"
        })
    }
})



collectionRouter.post("/create-metadata", upload.single("token-image"),async (req, res)=>{
    try {
        const filePath = `./uploads/${req.file?.filename}`
        const file =await fs.readFile(filePath)
        if (!file) {
            console.log(file)
            res.status(401).send({
                message: "Bad Request"
            })
            return
        }
        const blob = new Blob([file])
        const pinatafile = new File([blob], `${req.file?.filename}`, { type: req.file?.mimetype })
        const upload = await pinata.upload.file(pinatafile)
        const metadataipfs = await pinata.upload.json({
            name: req.file?.originalname,
            description: "File description",
            image: `ipfs://${upload.IpfsHash}`,
            date: Date.now()
        })
        fs.unlink(filePath)
        res.status(201).send({
            metadata: `ipfs://${metadataipfs.IpfsHash}`
        })
    } catch(e) {
        console.log(e)
        res.status(500).send({
            message: "Internal Server Error"
        })
    }    
})


//mint new token inside collection
collectionRouter.post("/mint/:collectionaddress",async (req, res)=>{
    try {
        const validateData = mintSchema.safeParse(req.body)
        if (!validateData.success) {
            res.status(401).send({
                message: "Bad Request"
            })
            return
        }
        const contract = await getContractForWriting(req.user.privatekey, req.params.collectionaddress)
        const tx = await contract.mint(validateData.data.creator, validateData.data.to, validateData.data.tokenUri)
        await tx.wait()
        res.status(201).send({
            transaction: tx
        })
    } catch(e) {
        console.log(e)
        res.status(500).send({
            message: "Internal Server"
        })
    }
})

//send the nfts to other users inside same collection`
collectionRouter.post("/send/:collectionaddress",async (req, res)=>{
    const validateData = transferAssetSchema.safeParse(req.body)
    if(!validateData.success) {
        sendBadRequest(req, res)
        return
    }
    try {
        const requestData = validateData.data
        const contract =await getContractForWriting(req.user.privatekey, req.params.collectionaddress)
        const tx = await contract.safeTransferFrom(req.user.address, requestData.to, requestData.tokenId)
        await tx.wait()
        res.status(200).send({
            transaction: tx
        })
    } catch(e) {
        console.log(e)
        sendInternalError(req, res)
    }
})

function sendInternalError(req: Request, res: Response) {
    res.status(500).send({
        message: "Internal Servor",
    })
}

function sendBadRequest(req: Request, res: Response) {
    res.status(400).send({
        message: "Bad Request"
    })
}



export default collectionRouter