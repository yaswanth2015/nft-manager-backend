"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.convertToJwt = convertToJwt;
exports.decodeFromJWT = decodeFromJWT;
const express_1 = require("express");
const userSchema_1 = require("../zodschemas/userSchema");
const prisma_1 = require("../prisma");
const bcrypt_1 = require("bcrypt");
const jwt = __importStar(require("jsonwebtoken"));
const ethers_1 = require("ethers");
const userRouter = (0, express_1.Router)();
const saltRounds = 10;
const JWT_SECRET = "nft-manager";
const NEEMONICS = process.env.MNEMONIC;
const derivationPath = `m/44'/60'/x'/0/0`;
function encryptPassword(passowrd) {
    const hash = (0, bcrypt_1.hashSync)(passowrd, saltRounds);
    return hash;
}
function verifyPassword(password, hash) {
    return (0, bcrypt_1.compareSync)(password, hash);
}
function convertToJwt(id) {
    const token = jwt.sign(id, JWT_SECRET);
    return token;
}
function decodeFromJWT(token) {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload;
}
userRouter.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield userSchema_1.userSchema.safeParse(req.body);
    console.log(req.body);
    if (data.success) {
        try {
            const user = data.data;
            const userFromDB = yield prisma_1.prisma.user.create({
                data: {
                    email: user.email,
                    passowrd: encryptPassword(user.password),
                }
            });
            const derivationPathForThisAccount = derivationPath.replace("x", `${userFromDB.id}`);
            console.log(`derivation path ${derivationPathForThisAccount}`);
            const wallet = ethers_1.HDNodeWallet.fromPhrase(NEEMONICS, undefined, derivationPathForThisAccount);
            yield prisma_1.prisma.user.update({
                where: {
                    id: userFromDB.id
                },
                data: {
                    privatekey: wallet.privateKey,
                    publickey: wallet.publicKey,
                    address: wallet.address
                }
            });
            res.status(201).send({
                "message": "user created successfully"
            });
        }
        catch (e) {
            console.log(e);
            res.status(500).send({
                message: "Error in stroing in DB"
            });
        }
    }
    else {
        res.status(400).send({
            message: "Invalid Details"
        });
    }
}));
userRouter.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield userSchema_1.userSchema.safeParseAsync(req.body);
    if (data.success) {
        const userDetails = data.data;
        const userInDb = yield prisma_1.prisma.user.findFirst({
            where: {
                email: userDetails.email
            }
        });
        if (userInDb) {
            const isValidUser = verifyPassword(userDetails.password, userInDb.passowrd);
            if (isValidUser) {
                res.status(200).send({
                    token: convertToJwt(`${userInDb.id}`)
                });
            }
            else {
                res.status(403).send({
                    message: "Invalid Password"
                });
            }
        }
        else {
            res.status(404).send({
                message: "User Not Present"
            });
        }
    }
    else {
        res.status(400).send({
            message: "Invalid Details"
        });
    }
}));
exports.default = userRouter;
