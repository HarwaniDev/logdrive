import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
            const key = `${ctx.session.user.email}/${input.folderName}/`;

            // Upload empty object as "folder marker"
            const command = new PutObjectCommand({
                Bucket: "logdrive",
                Key: key,
                Body: "", // just empty string
            });

            await Promise.all([
                // send command to s3
                s3.send(command),

                // create folder in db
                ctx.db.file.create({
                    data: {
                        name: input.folderName,
                        type: "FOLDER",
                        parentId: null, // root folder
                        ownerId: ctx.session.user.id,
                    }
                })
            ]);
            return {
                success: true
            }
        }),

    // TODO:- check for scenario when same name files are uploaded to root or in a same folder.
    // TODO:- see how can we add filesize to db.
    addFile: protectedProcedure
        .input(z.object({
            fileName: z.string().min(1),
            fileType: z.string(),
            fileSize: z.number(),
            folderId: z.string().nullable(),       // folderId === null for root 
        }))
        .mutation(async ({ ctx, input }) => {
            let key;
            if (input.folderId !== null) {
                // Verify the folder exists
                const folder = await ctx.db.file.findFirst({
                    where: {
                        id: input.folderId,
                        type: "FOLDER",
                        // ownerId: ctx.session.user.id,
                        deletedAt: null,
                    }
                });
                if (!folder) {
                    throw new Error("folder not found");
                } else {
                    key = `${ctx.session.user.email}/${folder?.name}/${input.fileName}`
                }
            } else {
                key = `${ctx.session.user.email}/${input.fileName}`;
            }

            const command = new PutObjectCommand({
                Bucket: "logdrive",
                Key: key,
                ContentType: input.fileType,
            });

            const [url, file] = await Promise.all([
                getSignedUrl(s3, command, { expiresIn: 120 }), // 120 sec,
                ctx.db.file.create({
                    data: {
                        name: input.fileName,
                        type: "FILE",
                        parentId: input.folderId,
                        s3Key: key,
                        mimeType: input.fileType,
                        // size: input.fileSize,
                        ownerId: ctx.session.user.id,
                    }
                })
            ]);
            const fileId = file.id;

            return { url, key, fileId };
        }),
    // use this in frontend after user uploads the file. If file upload is successful then send isUploaded as true or else false
    confirmUpload: protectedProcedure
        .input(z.object({
            isUploaded: z.boolean(),
            fileId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            console.log("confirm upload");
            console.log(input.fileId);

            await ctx.db.file.update({
                where: {
                    id: input.fileId
                },
                data: {
                    status: input.isUploaded === true ? "ACTIVE" : "FAILED"
                }
            });
            return {
                success: true
            }
        }),
    getContent: protectedProcedure
        .input(z.object({
            folderId: z.string().nullable(), // null = root
        }))
        .query(async ({ ctx, input }) => {
            const files = await ctx.db.file.findMany({
                where: {
                    parentId: input.folderId,
                    // ownerId: ctx.session.user.id,
                    deletedAt: null,
                },
                orderBy: [
                    { type: "desc" },   // folders first
                    { name: "asc" }     // then alphabetically
                ],
                include: {
                    _count: {
                        select: {
                            children: true
                        }
                    }
                }
            });

            return files;
        })
})