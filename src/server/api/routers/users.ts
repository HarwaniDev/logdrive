import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import bcrypt from "bcryptjs";

export const userRouter = createTRPCRouter({
    addUser: protectedProcedure
        .input(
            z.object({
                name: z.string(),
                email: z.string(),
                password: z.string()
            })
        )
        .mutation(async ({ ctx, input }) => {
            if (ctx.session.user.role !== "admin") {
                return {
                    message: "Only admin has the right to add a user"
                }
            }
            const user = await ctx.db.user.findUnique({
                where: {
                    email: input.email
                }
            });
            if (user) {
                return {
                    message: "user with the provided email already exists"
                }
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(input.password, salt);

            const newUser = await ctx.db.user.create({
                data: {
                    name: input.name,
                    email: input.email,
                    password: hashedPassword,
                    role: "employee",
                }
            })
            return {
                name: newUser.name,
                email: newUser.email,
            }
        })
})