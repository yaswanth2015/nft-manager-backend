import { Router } from "express";
import zod from "zod"
import fs from "fs/promises"
import { ethers } from "ethers";
import { prisma } from "../prisma";

const collectionRouter = Router()
const nftInitSchema = zod.object({
    name: zod.string(),
    symbol: zod.string()
})
const BLOCKCHAIN_URL = process.env.BLOCK_CHAIN_URL as unknown as string
const contractCreationSchema = zod.object({
    name: zod.string(),
    symbol: zod.string()
})

//Create a new collection and makes the user as owner of the collection
collectionRouter.post("/create", async (req, res)=>{
    const data = contractCreationSchema.safeParse(req.body)
    if (data.success) {
        try {
            const fileByteCode = await fs.readFile("./contracts/nft-contract.json")
            const fileData = JSON.parse(fileByteCode.toString())
            const abi = fileData["abi"]
            const byteCode = fileData["bytecode"]["object"]
            const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_URL)
            const wallet = new ethers.Wallet(req.user.privatekey as unknown as string, provider)
            const constructorArgs = [req.body.name, req.body.symbol]
            const factory = new ethers.ContractFactory(abi, byteCode, wallet)
            const contract = await factory.deploy(...constructorArgs)
            const addressOfContract = await contract.getAddress()
            await prisma.collectionOwners.create({
                data: {
                    ownerId: req.user.id,
                    collectionAddress: addressOfContract
                }
            })
            res.status(201).send({
                contract: addressOfContract
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
collectionRouter.get("/",(req, res)=>{})


//mint new token inside collection
collectionRouter.post("/mint/:collectionaddress", (req, res)=>{

})

export default collectionRouter