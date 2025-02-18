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
const collectionRouter = (0, express_1.Router)();
const nftInitSchema = zod_1.default.object({
    name: zod_1.default.string(),
    symbol: zod_1.default.string()
});
const BLOCKCHAIN_URL = process.env.BLOCK_CHAIN_URL;
const contractCreationSchema = zod_1.default.object({
    name: zod_1.default.string(),
    symbol: zod_1.default.string()
});
//Create a new collection and makes the user as owner of the collection
collectionRouter.post("/create", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = contractCreationSchema.safeParse(req.body);
    if (data.success) {
        try {
            const fileByteCode = yield promises_1.default.readFile("./contracts/nft-contract.json");
            const fileData = JSON.parse(fileByteCode.toString());
            const abi = fileData["abi"];
            const byteCode = fileData["bytecode"]["object"];
            const provider = new ethers_1.ethers.JsonRpcProvider(BLOCKCHAIN_URL);
            const wallet = new ethers_1.ethers.Wallet(req.user.privatekey, provider);
            const constructorArgs = [req.body.name, req.body.symbol];
            const factory = new ethers_1.ethers.ContractFactory(abi, byteCode, wallet);
            const contract = yield factory.deploy(...constructorArgs);
            const addressOfContract = yield contract.getAddress();
            yield prisma_1.prisma.collectionOwners.create({
                data: {
                    ownerId: req.user.id,
                    collectionAddress: addressOfContract
                }
            });
            res.status(201).send({
                contract: addressOfContract
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
collectionRouter.get("/", (req, res) => { });
//mint new token inside collection
collectionRouter.post("/mint/:collectionaddress", (req, res) => {
});
exports.default = collectionRouter;
