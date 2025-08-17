import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import z from "zod";
// TODO: update when moving to real s3
const s3 = new S3Client({
    region: "us-east-1",
    endpoint: "http://localhost:9000",
    forcePathStyle: true,
    credentials: {
        accessKeyId: "admin",
        secretAccessKey: "password",
    },
});


export const fileRouter = createTRPCRouter({
    addFolder: protectedProcedure
        .input(
            z.object({
                folderName: z.string().min(1)
            })
        )
        .mutation(async ({ ctx, input }) => {
            const key = `${ctx.session.user.id}/${input.folderName}/`;

            // Upload empty object as "folder marker"
            const command = new PutObjectCommand({
                Bucket: "logdrive",
                Key: key,
                Body: "", // just empty string
            });
            await s3.send(command);

            return {
                success: true,
                key
            }
        })


})