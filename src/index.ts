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
                passowrd: string;
                privatekey: string | null;
                publickey: string | null;
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

app.use(async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]
    if (token) {
        const decodeFromJson = parseInt(decodeFromJWT(token) as unknown as string)
        const data = zod.number().safeParse(decodeFromJson)
        if (data.success) {
            const user = await prisma.user.findFirst({
                where: {
                    id: data.data
                }
            })
            if (user) {
                req.user = user
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
})


app.use("/api/v1/eth", balanceRouter)



app.use("/api/v1/collections", collectionRouter)


//get all the nfts owned by user in any collection
app.get("/api/v1/nfts")
//send the nfts to other users inside same collection`
app.post("/api/v1/collections/send/:collectionaddress")


app.listen(3030, ()=>{
    console.log("Server Started Successfully")
})
