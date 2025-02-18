"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenSchema = exports.userSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.userSchema = zod_1.default.object({
    email: zod_1.default.string().email({
        message: "Invalid Email"
    }),
    password: zod_1.default.string().min(4).max(10)
});
exports.tokenSchema = zod_1.default.string();
