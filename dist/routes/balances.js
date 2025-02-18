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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ethers_1 = require("ethers");
const ethers_2 = require("ethers");
const balanceRouter = (0, express_1.Router)();
// returns the eth balance of the user
balanceRouter.get("/balance", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const providers = new ethers_1.JsonRpcProvider(process.env.BLOCK_CHAIN_URL);
    if (req.user.publickey) {
        const balance = yield providers.getBalance(req.user.publickey);
        res.status(200).send({
            balance: balance / ethers_2.WeiPerEther
        });
    }
    else {
        res.status(404).send({
            message: "Wallet Address is not generated"
        });
    }
}));
exports.default = balanceRouter;
