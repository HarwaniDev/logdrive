import { observable } from "@trpc/server/observable";
import {
    createTRPCRouter,
    protectedProcedure,
} from "~/server/api/trpc";
import { EventEmitter } from "events";
import { TRPCError } from "@trpc/server";

// Global event emitter for presence events
const presenceEmitter = new EventEmitter();

// In-memory store for user presence (use Redis in production)
const userPresence = new Map<string, {
    userId: string;
    userName: string;
    status: "online" | "offline";
    lastSeen: Date;
    connectionCount: number;
}>();

// Cleanup interval to mark users offline after inactivity
const OFFLINE_THRESHOLD = 30000; // 30 seconds
setInterval(() => {
    const now = new Date();
    for (const [userId, presence] of userPresence.entries()) {
        if (presence.connectionCount === 0 &&
            now.getTime() - presence.lastSeen.getTime() > OFFLINE_THRESHOLD) {
            if (presence.status === "online") {
                presence.status = "offline";
                presenceEmitter.emit("presence", {
                    userId: presence.userId,
                    userName: presence.userName,
                    status: "offline",
                    lastSeen: presence.lastSeen,
                });
            }
        }
    }
}, 10000); // Check every 10 seconds

export type PresenceEvent = {
    userId: string;
    userName: string;
    status: "online" | "offline";
    lastSeen: Date;
};

export const presenceRouter = createTRPCRouter({
    // Get all online users
    getOnlineUsers: protectedProcedure.query(({ ctx }) => {
        if (ctx.session.user.role !== "admin") {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "only admin can subscribe" });
        }
        const onlineUsers = Array.from(userPresence.values())
            .filter(presence => presence.status === "online")
            .map(presence => ({
                userId: presence.userId,
                userName: presence.userName,
                lastSeen: presence.lastSeen,
            }));

        return onlineUsers;
    }),

    // Set user online
    setOnline: protectedProcedure.mutation(async ({ ctx }) => {
        const userId = ctx.session.user.id;
        const userName = ctx.session.user.name || "Unknown User";

        const existing = userPresence.get(userId);

        if (existing) {
            existing.connectionCount++;
            existing.lastSeen = new Date();
            if (existing.status === "offline") {
                existing.status = "online";
                presenceEmitter.emit("presence", {
                    userId,
                    userName,
                    status: "online",
                    lastSeen: existing.lastSeen,
                });
            }
        } else {
            userPresence.set(userId, {
                userId,
                userName,
                status: "online",
                lastSeen: new Date(),
                connectionCount: 1,
            });

            presenceEmitter.emit("presence", {
                userId,
                userName,
                status: "online",
                lastSeen: new Date(),
            });
        }

        return { success: true };
    }),

    // Set user offline
    setOffline: protectedProcedure.mutation(async ({ ctx }) => {
        const userId = ctx.session.user.id;
        const presence = userPresence.get(userId);

        if (presence) {
            presence.connectionCount = Math.max(0, presence.connectionCount - 1);
            presence.lastSeen = new Date();

            if (presence.connectionCount === 0) {
                presence.status = "offline";
                presenceEmitter.emit("presence", {
                    userId: presence.userId,
                    userName: presence.userName,
                    status: "offline",
                    lastSeen: presence.lastSeen,
                });
            }
        }

        return { success: true };
    }),

    // Heartbeat to keep user online
    heartbeat: protectedProcedure.mutation(async ({ ctx }) => {
        const userId = ctx.session.user.id;
        const presence = userPresence.get(userId);

        if (presence) {
            presence.lastSeen = new Date();
            if (presence.status === "offline" && presence.connectionCount > 0) {
                presence.status = "online";
                presenceEmitter.emit("presence", {
                    userId: presence.userId,
                    userName: presence.userName,
                    status: "online",
                    lastSeen: presence.lastSeen,
                });
            }
        }

        return { success: true };
    }),

    // Subscribe to presence changes
    onPresenceChange: protectedProcedure.subscription(({ ctx }) => {
        if (ctx.session.user.role !== "admin") {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "only admin can subscribe" });
        }
        return observable<PresenceEvent>((emit) => {
            const onPresence = (data: PresenceEvent) => {
                emit.next(data);
            };

            presenceEmitter.on("presence", onPresence);

            return () => {
                presenceEmitter.off("presence", onPresence);
            };
        });
    }),
});