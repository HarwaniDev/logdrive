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
            try {
                const key = `${ctx.session.user.email}/${input.folderName}/`;

                // Upload empty object as "folder marker"
                const command = new PutObjectCommand({
                    Bucket: "logdrive",
                    Key: key,
                    Body: "", // just empty string
                });

                // send command to s3
                const s3Response = await s3.send(command);

                if (!s3Response) {
                    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AWS S3 services are down" });
                }
                await ctx.db.$transaction(async (tx) => {
                    const file = await tx.file.create({
                        data: {
                            name: input.folderName,
                            type: "FOLDER",
                            parentId: input.parentId, // if null, will be stored in root
                            ownerId: ctx.session.user.id,
                            status: "ACTIVE"
                        }
                    });

                    await tx.activityLog.create({
                        data: {
                            userId: ctx.session.user.id,
                            fileId: file.id,
                            action: "CREATE_FOLDER",
                            userAgent: ctx.headers.get("User-Agent")
                        }
                    });
                });

                return { success: true };
            } catch (error) {
                console.error("addFolder failed:", error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create folder" });
            }
        }),
    getExpiredContent: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const now = new Date();
                const files = await ctx.db.file.findMany({
                    where: {
                        showFile: true,
                        type: { not: "FOLDER" },
                        expiryDate: {
                            lt: now
                        },
                        status: "ACTIVE"
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
            } catch (error) {
                console.error("getExpiredContent failed:", error);
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch expired content" });
            }
        }),
    getFilesExpiringWithinAMonth: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const now = new Date();
                const oneMonthLater = new Date();
                oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
                const files = await ctx.db.file.findMany({
                    where: {
                        showFile: true,
                        type: { not: "FOLDER" },
                        expiryDate: {
                            gte: now,
                            lte: oneMonthLater
                        },
                        status: "ACTIVE"
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
            } catch (error) {
                console.error("getFilesExpiringWithinAMonth failed:", error);
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch expired content" });
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
            expiryDate: z.date().optional()
        }))
        .mutation(async ({ ctx, input }) => {
            try {
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
                        throw new TRPCError({ message: "folder not found", code: "BAD_REQUEST" });
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

                const url = await getSignedUrl(s3, command, { expiresIn: 120 });
                if (!url) {
                    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AWS services are down" })
                }
                const file = await ctx.db.file.create({
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
                const fileId = file.id;

                return { url, key, fileId };
            } catch (error) {
                console.error("addFile failed:", error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add file" });
            }
        }),
    // use this in frontend after user uploads the file. If file upload is successful then send isUploaded as true or else false
    confirmUpload: protectedProcedure
        .input(z.object({
            isUploaded: z.boolean(),
            fileId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            try {
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
                        action: "UPLOAD",
                        userAgent: ctx.headers.get("User-Agent")
                    }
                });
                return {
                    success: true
                }
            } catch (error) {
                console.error("confirmUpload failed:", error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to confirm upload" });
            }
        }),
    getContent: protectedProcedure
        .input(z.object({
            folderId: z.string().nullable(), // null = root
        }))
        .query(async ({ ctx, input }) => {
            try {
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
                        status: "ACTIVE"
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
            } catch (error) {
                console.error("getContent failed:", error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch content" });
            }
        }),
    getFileUrl: protectedProcedure
        .input(z.object({
            fileId: z.string(),
            download: z.boolean().optional(), // false = preview, true = download
        }))
        .mutation(async ({ ctx, input }) => {
            try {
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
                            action: input.download ? "DOWNLOAD" : "PREVIEW",
                            userAgent: ctx.headers.get("User-Agent")
                        }
                    })
                ]);

                return { url };
            } catch (error) {
                console.error("getFileUrl failed:", error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to get file URL" });
            }
        }),
    deleteFile: protectedProcedure
        .input(z.object({
            fileId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const file = await ctx.db.file.findUnique({
                    where: {
                        id: input.fileId,
                        type: "FILE"
                    }
                });
                if (!file) {
                    throw new TRPCError({ code: "NOT_FOUND", cause: "Cannot find provided fileId or the fileId is associated with a folder" });
                };
                await ctx.db.$transaction(async (tx) => {
                    await tx.file.update({
                        where: {
                            id: input.fileId
                        },
                        data: {
                            showFile: false,
                            deletedAt: new Date(),
                            deletedById: ctx.session.user.id
                        }
                    });
                    await tx.activityLog.create({
                        data: {
                            userId: ctx.session.user.id,
                            fileId: input.fileId,
                            action: "DELETE",
                            userAgent: ctx.headers.get("User-Agent")
                        }
                    });
                });
                return {
                    
                    message: "file deleted successfully"
                }
            } catch (error) {
                console.error("deleteFile failed:", error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete file" });
            }
        }),
    getTrashContent: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const files = await ctx.db.file.findMany({
                    where: {
                        deletedAt: { not: null },
                        type: { not: "FOLDER" },
                        status: "ACTIVE"
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
                        },
                        owner: {
                            select: {
                                name: true
                            }
                        },
                        deletedBy: {
                            select: {
                                name: true
                            }
                        }
                    }
                });
                return files;
            } catch (error) {
                console.error("getTrashContent failed:", error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch trash content" });
            }
        }),
    restoreFile: protectedProcedure
        .input(z.object({
            fileId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const file = await ctx.db.file.findUnique({
                    where: {
                        id: input.fileId
                    }
                });
                if (!file) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "fileId not found or is invalid" })
                }
                await ctx.db.$transaction(async (tx) => {
                    await tx.file.update({
                        where: {
                            id: input.fileId
                        },
                        data: {
                            deletedAt: null,
                            showFile: true
                        }
                    });
                    await tx.activityLog.create({
                        data: {
                            userId: ctx.session.user.id,
                            fileId: input.fileId,
                            action: "RESTORE",
                            userAgent: ctx.headers.get("User-Agent")
                        }
                    });
                })

                return {
                    message: "file restored successfully"
                }
            } catch (error) {
                console.error("restoreFile failed:", error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to restore file" });
            }
        }),
    updateExpiryDate: protectedProcedure
        .input(z.object({
            fileId: z.string(),
            newExpiryDate: z.date()
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const file = await ctx.db.file.findUnique({
                    where: {
                        id: input.fileId
                    }
                });
                if (!file) {
                    throw new TRPCError({ message: "file not found or invalid fileId", code: "NOT_FOUND" });
                };

                const today = new Date();
                if (input.newExpiryDate < today) {
                    throw new TRPCError({ message: "expiry date cannot be set to a date previous than today's date", code: "BAD_REQUEST" });
                }

                await ctx.db.$transaction(async (tx) => {
                    await tx.file.update({
                        where: {
                            id: input.fileId
                        },
                        data: {
                            expiryDate: input.newExpiryDate
                        }
                    });
                    await tx.activityLog.create({
                        data: {
                            userId: ctx.session.user.id,
                            fileId: input.fileId,
                            action: "UPDATE_EXPIRY",
                            userAgent: ctx.headers.get("User-Agent"),
                            previousExpiry: file.expiryDate
                        }
                    })
                })
                return {
                    message: "expiry date updated successfully"
                }
            } catch (error) {
                console.error("updateExpiryDate failed:", error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update expiry date" });
            }
        })
})