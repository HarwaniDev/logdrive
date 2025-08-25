import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { PutObjectCommand, S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import z from "zod";
import { TRPCError } from "@trpc/server";

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
                folderName: z.string().min(1),
                parentId: z.string().nullable()
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

            const [_, file] = await Promise.all([
                // send command to s3
                s3.send(command),

                // create folder in db
                ctx.db.file.create({
                    data: {
                        name: input.folderName,
                        type: "FOLDER",
                        parentId: input.parentId, // if null, will be stored in root
                        ownerId: ctx.session.user.id,
                    }
                }),
            ]);

            await ctx.db.activityLog.create({
                data: {
                    userId: ctx.session.user.id,
                    fileId: file.id,
                    action: "CREATE_FOLDER"
                }
            });
            return {
                success: true
            }
        }),
    getExpiryContent: protectedProcedure
        .query(async ({ ctx }) => {
            const files = await ctx.db.file.findMany({
                where: {
                    deletedAt: null,
                    type: { not: "FOLDER" },
                    expiryDate: { not: null }
                },
                orderBy: [
                    { name: "asc" }
                ],
                include: {
                    owner: {
                        select: {
                            name: true
                        }
                    }
                }
            });
            return files;
        }),

    // TODO:- check for scenario when same name files are uploaded to root or in a same folder.
    // TODO:- see how can we add filesize to db.
    addFile: protectedProcedure
        .input(z.object({
            fileName: z.string().min(1),
            fileType: z.string(),
            fileSize: z.number(),
            folderId: z.string().nullable(),       // folderId === null for root
            expiryDate: z.date().optional()
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
                        size: input.fileSize,
                        ownerId: ctx.session.user.id,
                        expiryDate: input.expiryDate ?? null
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
            const file = await ctx.db.file.update({
                where: {
                    id: input.fileId
                },
                data: {
                    status: input.isUploaded === true ? "ACTIVE" : "FAILED"
                }
            });

            await ctx.db.activityLog.create({
                data: {
                    userId: ctx.session.user.id,
                    fileId: file.id,
                    action: "UPLOAD"
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

            if (input.folderId) {
                const file = await ctx.db.file.findUnique({
                    where: {
                        id: input.folderId,
                        showFile: true
                    }
                })
                if (!file) {
                    throw new TRPCError({ code: "BAD_REQUEST" })
                }
            }

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
                    },
                    owner: {
                        select: {
                            name: true
                        }
                    }
                }
            });
            return files;
        }),
    getFileUrl: protectedProcedure
        .input(z.object({
            fileId: z.string(),
            download: z.boolean().optional(), // false = preview, true = download
        }))
        .mutation(async ({ ctx, input }) => {
            const file = await ctx.db.file.findFirst({
                where: {
                    id: input.fileId,
                    type: "FILE",
                    showFile: true,
                },
            });

            if (!file || !file.s3Key) {
                throw new TRPCError({ message: "file not found", code: "NOT_FOUND" });
            }

            const command = new GetObjectCommand({
                Bucket: "logdrive",
                Key: file.s3Key,
                ResponseContentType: file.mimeType ?? undefined,
                ResponseContentDisposition: input.download
                    ? `attachment; filename="${file.name}"`
                    : undefined,
            });

            const [url, _] = await Promise.all([
                getSignedUrl(s3, command, { expiresIn: 600 }),
                await ctx.db.activityLog.create({
                    data: {
                        userId: ctx.session.user.id,
                        fileId: file.id,
                        action: input.download ? "DOWNLOAD" : "PREVIEW"
                    }
                })
            ]);

            return { url };
        }),
    deleteFile: protectedProcedure
        .input(z.object({
            fileId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const file = await ctx.db.file.findUnique({
                where: {
                    id: input.fileId,
                    type: "FILE"
                }
            });
            if (!file) {
                throw new TRPCError({ code: "NOT_FOUND", cause: "Cannot find provided fileId or the fileId is associated with a folder" });
            };
            await Promise.all([
                ctx.db.file.update({
                    where: {
                        id: input.fileId
                    },
                    data: {
                        showFile: false,
                        deletedAt: new Date()
                    }
                }),
                ctx.db.activityLog.create({
                    data: {
                        userId: ctx.session.user.id,
                        fileId: input.fileId,
                        action: "DELETE"
                    }
                })
            ]);
            return {
                message: "file deleted successfully"
            }
        }),
    getTrashContent: protectedProcedure
        .query(async ({ ctx }) => {
            const files = await ctx.db.file.findMany({
                where: {
                    deletedAt: { not: null },
                    type: { not: "FOLDER" }
                },
                orderBy: [
                    { type: "desc" },
                    { name: "asc" }     // alphabetically
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
        }),
    restoreFile: protectedProcedure
        .input(z.object({
            fileId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const file = await ctx.db.file.findUnique({
                where: {
                    id: input.fileId
                }
            });
            if (!file) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "fileId not found or is invalid" })
            }
            await ctx.db.file.update({
                where: {
                    id: input.fileId
                },
                data: {
                    deletedAt: null,
                    showFile: true
                }
            })

            return {
                message: "file restored successfully"
            }
        })
})