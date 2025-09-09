// import { postRouter } from "~/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { userRouter } from "~/server/api/routers/users";
import { fileRouter } from "~/server/api/routers/file";
import { activityRouter } from "~/server/api/routers/activity";
import { presenceRouter } from "~/server/api/routers/presence";
import { cronRouter } from "./routers/cron";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  file: fileRouter,
  activity: activityRouter,
  presence: presenceRouter,
  cron: cronRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
