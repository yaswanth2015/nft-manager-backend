import express from "express"
import userRouter, { decodeFromJWT } from "./routes/user-routes"
import zod from "zod"
import { prisma } from "./prisma"
import balanceRouter from "./routes/balances"
import collectionRouter from "./routes/collections"

declare global {
    namespace Express {
        export interface Request{
            user: {
                id: number;
                email: string;
                privatekey: string;
                publickey: string;
                address: string
            }
        }
    }
}

export const tokenSchema = zod.object({
    id: zod.number()
})


const app = express()

app.use(express.json())

app.use("/api/v1/user", userRouter)

//Below is the auth middleware
app.use(async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]
    try {
        if (token) {
            const decodeFromJson = parseInt(decodeFromJWT(token) as unknown as string)
            const data = zod.number().safeParse(decodeFromJson)
            if (data.success) {
                const user = await prisma.user.findFirst({
                    where: {
                        id: data.data
                    }
                })
                if (user && user.privatekey !== null && user.publickey !== null && user.address !== null) {
                    req.user = {
                        id: user.id,
                        email: user.email,
                        privatekey: user.privatekey,
                        publickey: user.publickey,
                        address: user.address
                    }
                    next()
                } else {
                    res.status(404).send({
                        message: "User Not Found"
                    })
                }
            } else {
                res.status(403).send({
                    message: "Invalid Token"
                })
            }
        } else {
            res.status(403).send({
                message: "Token is not present Please login"
            })
        }
    } catch (e) {
        console.log(e)
        res.status(500).send({
            message: "Internal error"
        })
    }
})


app.use("/api/v1/eth", balanceRouter)
app.use("/api/v1/collections", collectionRouter)

//get all the nfts owned by user in any collection
app.get("/api/v1/nfts")


app.listen(3030, ()=>{
    console.log("Server Started Successfully")
})
