import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const activityRouter = createTRPCRouter({
    getAllActivityLogs: protectedProcedure
        .query(async ({ ctx }) => {
            // Check if user is admin
            if (ctx.session.user.role !== "admin") {
                throw new TRPCError({ message: "Only admin has access to view all activity logs", code: "UNAUTHORIZED" });
            }

            // Fetch all activity logs with user and file information
            const activityLogs = await ctx.db.activityLog.findMany({
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        }
                    },
                    file: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            s3Key: true,
                            expiryDate: true,
                        }
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                },
            });

            return activityLogs;
        }),

    getActivityLogsOfUser: protectedProcedure
        .input(z.object({
            employeeId: z.string()
        }))
        .query(async ({ ctx, input }) => {
            // Check if user is admin
            if (ctx.session.user.role !== "admin") {
                throw new TRPCError({ message: "Only admin has access to view activity logs", code: "UNAUTHORIZED" });
            }
            // check if employee exists or not
            const employee = await ctx.db.user.findUnique({
                where: {
                    id: input.employeeId
                }
            });
            if (!employee) {
                throw new TRPCError({ message: "Invalid employeeId", code: "NOT_FOUND" });
            }
            // fetch activities ordered by user
            const activityLogs = await ctx.db.activityLog.findMany({
                where: {
                    userId: input.employeeId
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        }
                    },
                    file: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            s3Key: true,
                            expiryDate: true,
                        }
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                }
            });

            return activityLogs;
        })
});
