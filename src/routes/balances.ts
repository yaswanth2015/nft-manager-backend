import { Router } from "express";
import { ethers, JsonRpcProvider } from "ethers";
import { WeiPerEther } from "ethers";


const balanceRouter = Router()


// returns the eth balance of the user
balanceRouter.get("/balance",async (req, res)=>{
    const user = req.user
    const providers = new JsonRpcProvider(process.env.BLOCK_CHAIN_URL)
    if(req.user.publickey) {
        const balance = await providers.getBalance(req.user.publickey)
        res.status(200).send({
            balance: balance/WeiPerEther
        })
    } else {
        res.status(404).send({
            message: "Wallet Address is not generated"
        })
    }
})


export default balanceRouter