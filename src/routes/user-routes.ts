import { Router } from "express";
import { userSchema } from "../zodschemas/userSchema";
import { prisma } from "../prisma";
import { hashSync, compareSync } from "bcrypt";
import * as jwt from "jsonwebtoken"
import { HDNodeWallet } from "ethers";
import { JwtPayload } from "jsonwebtoken";

const userRouter = Router()
const saltRounds = 10
const JWT_SECRET = "nft-manager"
const NEEMONICS = process.env.MNEMONIC as unknown as string
const derivationPath = `m/44'/60'/x'/0/0`

function encryptPassword(passowrd: string): string {
    const hash = hashSync(passowrd, saltRounds)
    return hash
}

function verifyPassword(password: string, hash: string): boolean {
    return compareSync(password, hash)
}

export function convertToJwt(id: string): string {
    const token = jwt.sign(id, JWT_SECRET)
    return token
}
 export function decodeFromJWT(token: string): string | JwtPayload {
    const payload = jwt.verify(token, JWT_SECRET)
    return payload
}


userRouter.post("/signup", async (req, res) => {
    const data = await userSchema.safeParse(req.body)
    if (data.success) {
        try {
            const user = data.data
            const userFromDB = await prisma.user.create({
                data: {
                    email: user.email,
                    passowrd: encryptPassword(user.password),
                }
            })

            const derivationPathForThisAccount = derivationPath.replace("x", `${userFromDB.id}`)
            const wallet = HDNodeWallet.fromPhrase(NEEMONICS, undefined, derivationPathForThisAccount)
            await prisma.user.update({
                where: {
                    id: userFromDB.id
                },
                data: {
                    privatekey: wallet.privateKey,
                    publickey: wallet.publicKey,
                    address: wallet.address
                }
            })
            res.status(201).send({
                "message": "user created successfully"
            })
        } catch (e) {
            console.log(e)
            res.status(500).send({
                message: "Error in stroing in DB"
            })
        }
    } else {
        res.status(400).send({
            message: "Invalid Details"
        })
    }
})


userRouter.post("/signin",async (req, res) => {
    const data =await userSchema.safeParseAsync(req.body)
    if (data.success) {
        const userDetails = data.data
        const userInDb = await prisma.user.findFirst({
            where: {
                email: userDetails.email
            }
        })
        if (userInDb) {
            const isValidUser = verifyPassword(userDetails.password, userInDb.passowrd)
            if (isValidUser) {
                res.status(200).send({
                    token: convertToJwt(`${userInDb.id}`)
                })
            } else {
                res.status(403).send({
                    message: "Invalid Password"
                })
            }
        } else {
            res.status(404).send({
                message: "User Not Present"
            })
        }
    } else {
        res.status(400).send({
            message: "Invalid Details"
        })
    }

})


export default userRouter