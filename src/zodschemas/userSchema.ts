import zod from "zod"
export const userSchema = zod.object({
    email: zod.string().email({
        message: "Invalid Email"
    }),
    password: zod.string().min(4).max(10)
})

export const tokenSchema = zod.string()
