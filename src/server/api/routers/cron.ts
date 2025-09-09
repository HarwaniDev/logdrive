import { addDays, endOfDay, startOfDay } from "date-fns";
import { createTRPCRouter, publicProcedure } from "../trpc";
import nodemailer from "nodemailer";
import { TRPCError } from "@trpc/server";

let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "medicarebrit@gmail.com",
        pass: process.env.GOOGLE_APP_PASSWORD,
    },
});
export const cronRouter = createTRPCRouter({
    expiryCheck: publicProcedure
        .query(async ({ ctx }) => {

            const authHeader = ctx.headers.get("Authorization");
            if (!authHeader) {
                return new TRPCError({ code: "BAD_REQUEST", message: "authentication header not provided" });
            }
            const token = authHeader?.split(" ")[1];
            if (token !== process.env.CRON_SECRET) {
                return new TRPCError({ code: "UNAUTHORIZED" });
            }

            const today = new Date();
            const files = await ctx.db.file.findMany({
                where: {
                    showFile: true,
                    type: { not: "FOLDER" },
                    expiryDate: {
                        gte: startOfDay(today),
                        lte: endOfDay(addDays(today, 30))
                    }
                },
                include: {
                    owner: {
                        select: {
                            email: true,
                            name: true
                        }
                    }
                }
            });

            files.map((file) => {
                // Send email
                transporter.sendMail({
                    from: '"Brit Medicare" <medicarebrit@gmail.com>', // sender address
                    to: "harwanidev@gmail.com",                  // list of receivers
                    subject: `Reminder: File Expiry of ${file.name}`,                           // subject line
                    text: `Dear ${file.owner.name},\n\nThis is a reminder that file: ${file.name} is about to expire.\n\nRegards,\nBrit Medicare`,                         // plain text body
                    html: `
                <p>Dear ${file.owner.name},</p>
                <p>This is a friendly reminder that file: ${file.name} is about to <b>expire</b>.</p>
                <p>Please take necessary action to renew it in time.</p>
                <p>Regards,<br>Brit Medicare</p>`,                  // html body
                })
                    .then(info => {
                        console.log("Message sent: %s", info.messageId);
                    })
                    .catch(err => {
                        console.error("Error: ", err);
                    });
            })
        }),
    deleteTrashFiles: publicProcedure
        .query(async ({ ctx }) => {
            const now = new Date();
            const oneMonthBackDate = new Date(
                now.getFullYear(),
                now.getMonth() - 1,
                now.getDate()
            );

            const _ = await ctx.db.file.deleteMany({
                where: {
                    showFile: false,
                    type: { not: "FOLDER" },
                    deletedAt: {
                        lte: oneMonthBackDate
                    }
                }
            });
        })
})