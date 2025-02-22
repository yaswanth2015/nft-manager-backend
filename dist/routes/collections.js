"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = __importDefault(require("zod"));
const promises_1 = __importDefault(require("fs/promises"));
const ethers_1 = require("ethers");
const prisma_1 = require("../prisma");
const axios_1 = __importDefault(require("axios"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const pinata_web3_1 = require("pinata-web3");
const collectionRouter = (0, express_1.Router)();
const nftInitSchema = zod_1.default.object({
    name: zod_1.default.string(),
    symbol: zod_1.default.string()
});
const mintSchema = zod_1.default.object({
    creator: zod_1.default.string(),
    to: zod_1.default.string(),
    tokenUri: zod_1.default.string()
});
const transferAssetSchema = zod_1.default.object({
    to: zod_1.default.string(),
    tokenId: zod_1.default.number()
});
const BLOCKCHAIN_URL = process.env.BLOCK_CHAIN_URL;
const contractCreationSchema = zod_1.default.object({
    name: zod_1.default.string(),
    symbol: zod_1.default.string()
});
const abiByteCodeFilePath = "./out/UserToken.sol/UserNFTToken.json";
const contractNamePath = "./src/contracts/UserToken.sol:UserNFTToken";
const flattenCodePath = "./src/flatten-contracts/UserToken.sol";
const diskStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads");
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const uniquestring = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + uniquestring + ext);
    }
});
const upload = (0, multer_1.default)({
    storage: diskStorage
});
const pinata = new pinata_web3_1.PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.PINATA_GATEWAY
});
function deployContract(privateKey, contractData) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileByteCode = yield promises_1.default.readFile(abiByteCodeFilePath);
        const fileData = JSON.parse(fileByteCode.toString());
        const abi = fileData["abi"];
        const byteCode = fileData["bytecode"]["object"];
        const provider = new ethers_1.ethers.JsonRpcProvider(BLOCKCHAIN_URL);
        const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
        const constructorArgs = [contractData.name, contractData.symbol];
        const factory = new ethers_1.ethers.ContractFactory(abi, byteCode, wallet);
        const contract = yield factory.deploy(...constructorArgs);
        const addressOfContract = yield contract.getAddress();
        console.log(`contract address is ${addressOfContract}`);
        return addressOfContract;
    });
}
function verifyContract(contractAddress, name, symbol) {
    return __awaiter(this, void 0, void 0, function* () {
        const EtherScanAPI = process.env.ETHER_SCAN_URL;
        const EtherScanAPIKEY = process.env.ETHER_SCAN_API_KEY;
        const contractName = contractNamePath;
        const sourceCode = (yield promises_1.default.readFile(flattenCodePath)).toString();
        const compilerversion = "v0.8.28+commit.7893614a";
        const constructorArguemnts = ethers_1.AbiCoder.defaultAbiCoder().encode(["string memory", "string memory"], [name, symbol]);
        console.log(`const argu ${constructorArguemnts}`);
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
        };
        const response = yield axios_1.default.post(EtherScanAPI, null, {
            data
        });
        console.log(`verifying response`);
        console.log(response);
        return response.data;
    });
}
function getContractForWriting(privateKey, contractAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        const rpcProvider = new ethers_1.JsonRpcProvider(BLOCKCHAIN_URL);
        const rawabiByteCode = yield promises_1.default.readFile(abiByteCodeFilePath);
        const parsedABI = JSON.parse(rawabiByteCode.toString());
        const wallet = new ethers_1.ethers.Wallet(privateKey, rpcProvider);
        const contract = new ethers_1.ethers.Contract(contractAddress, parsedABI['abi'], wallet);
        return contract;
    });
}
function getContractForReading(contractAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        const rpcProvider = new ethers_1.JsonRpcProvider(BLOCKCHAIN_URL);
        const rawabiByteCode = yield promises_1.default.readFile(abiByteCodeFilePath);
        const parsedABI = JSON.parse(rawabiByteCode.toString());
        const contract = new ethers_1.ethers.Contract(contractAddress, parsedABI['abi'], rpcProvider);
        return contract;
    });
}
//Create a new collection and makes the user as owner of the collection
collectionRouter.post("/create", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = contractCreationSchema.safeParse(req.body);
    if (data.success) {
        try {
            //First check if the enough gas fees is present
            const deloyedContractAddress = yield deployContract(req.user.privatekey, data.data);
            yield prisma_1.prisma.collectionOwners.create({
                data: {
                    ownerId: req.user.id,
                    collectionAddress: deloyedContractAddress
                }
            });
            //const verifyCOntract = await verifyContract(deloyedContractAddress, data.data.name, data.data.symbol)
            res.status(201).send({
                contract: deloyedContractAddress
            });
        }
        catch (e) {
            console.log(e);
            res.status(500).send({
                message: "Unbale to create a contract"
            });
        }
    }
    else {
        res.status(400).send({
            message: "Bad Request"
        });
    }
}));
//get all collections owned by the user and was created by the app
collectionRouter.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const collections = yield prisma_1.prisma.collectionOwners.findMany({
            where: {
                ownerId: req.user.id
            },
            select: {
                collectionAddress: true
            }
        });
        res.status(200).send({
            collections: collections
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).send({
            message: "Internal Server"
        });
    }
}));
collectionRouter.post("/create-metadata", upload.single("token-image"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const filePath = `./uploads/${(_a = req.file) === null || _a === void 0 ? void 0 : _a.filename}`;
        const file = yield promises_1.default.readFile(filePath);
        if (!file) {
            console.log(file);
            res.status(401).send({
                message: "Bad Request"
            });
            return;
        }
        const blob = new Blob([file]);
        const pinatafile = new File([blob], `${(_b = req.file) === null || _b === void 0 ? void 0 : _b.filename}`, { type: (_c = req.file) === null || _c === void 0 ? void 0 : _c.mimetype });
        const upload = yield pinata.upload.file(pinatafile);
        const metadataipfs = yield pinata.upload.json({
            name: (_d = req.file) === null || _d === void 0 ? void 0 : _d.originalname,
            description: "File description",
            image: `ipfs://${upload.IpfsHash}`,
            date: Date.now()
        });
        promises_1.default.unlink(filePath);
        res.status(201).send({
            metadata: `ipfs://${metadataipfs.IpfsHash}`
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).send({
            message: "Internal Server Error"
        });
    }
}));
//mint new token inside collection
collectionRouter.post("/mint/:collectionaddress", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validateData = mintSchema.safeParse(req.body);
        if (!validateData.success) {
            res.status(401).send({
                message: "Bad Request"
            });
            return;
        }
        const contract = yield getContractForWriting(req.user.privatekey, req.params.collectionaddress);
        const tx = yield contract.mint(validateData.data.creator, validateData.data.to, validateData.data.tokenUri);
        yield tx.wait();
        res.status(201).send({
            transaction: tx
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).send({
            message: "Internal Server"
        });
    }
}));
//send the nfts to other users inside same collection`
collectionRouter.post("/send/:collectionaddress", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const validateData = transferAssetSchema.safeParse(req.body);
    if (!validateData.success) {
        sendBadRequest(req, res);
        return;
    }
    try {
        const requestData = validateData.data;
        const contract = yield getContractForWriting(req.user.privatekey, req.params.collectionaddress);
        const tx = yield contract.safeTransferFrom(req.user.address, requestData.to, requestData.tokenId);
        yield tx.wait();
        res.status(200).send({
            transaction: tx
        });
    }
    catch (e) {
        console.log(e);
        sendInternalError(req, res);
    }
}));
function sendInternalError(req, res) {
    res.status(500).send({
        message: "Internal Servor",
    });
}
function sendBadRequest(req, res) {
    res.status(400).send({
        message: "Bad Request"
    });
}
exports.default = collectionRouter;
