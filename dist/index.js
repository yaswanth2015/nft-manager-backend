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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenSchema = void 0;
const express_1 = __importDefault(require("express"));
const user_routes_1 = __importStar(require("./routes/user-routes"));
const zod_1 = __importDefault(require("zod"));
const prisma_1 = require("./prisma");
const balances_1 = __importDefault(require("./routes/balances"));
const collections_1 = __importDefault(require("./routes/collections"));
exports.tokenSchema = zod_1.default.object({
    id: zod_1.default.number()
});
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/api/v1/user", user_routes_1.default);
//Below is the auth middleware
app.use((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    try {
        if (token) {
            const decodeFromJson = parseInt((0, user_routes_1.decodeFromJWT)(token));
            const data = zod_1.default.number().safeParse(decodeFromJson);
            if (data.success) {
                const user = yield prisma_1.prisma.user.findFirst({
                    where: {
                        id: data.data
                    }
                });
                if (user && user.privatekey !== null && user.publickey !== null && user.address !== null) {
                    req.user = {
                        id: user.id,
                        email: user.email,
                        privatekey: user.privatekey,
                        publickey: user.publickey,
                        address: user.address
                    };
                    next();
                }
                else {
                    res.status(404).send({
                        message: "User Not Found"
                    });
                }
            }
            else {
                res.status(403).send({
                    message: "Invalid Token"
                });
            }
        }
        else {
            res.status(403).send({
                message: "Token is not present Please login"
            });
        }
    }
    catch (e) {
        console.log(e);
        res.status(500).send({
            message: "Internal error"
        });
    }
}));
app.use("/api/v1/eth", balances_1.default);
app.use("/api/v1/collections", collections_1.default);
//get all the nfts owned by user in any collection
app.get("/api/v1/nfts");
app.listen(3030, () => {
    console.log("Server Started Successfully");
});
