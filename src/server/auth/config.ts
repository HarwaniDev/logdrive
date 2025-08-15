import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { db } from "~/server/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
}


export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { 
          label: "Email", 
          type: "email",
          placeholder: "user@company.com"
        },
        password: { 
          label: "Password", 
          type: "password" 
        },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const email = credentials.email as string;
        const password = credentials.password as string;
        // Find user in database
        const user = await db.user.findUnique({
          where: {
            email: email,
          },
        });

        if (!user) {
          return null;
        }

        // Verify password
        const isValidPassword = bcrypt.compare(
          password,
          user.password
        );

        if (!isValidPassword) {
          return null;
        }

        // Return user object (without password)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60
  },
  jwt: {
    maxAge: 8 * 60 * 60
  },
  callbacks: {
    jwt: ({ token, user }) => {
      // Add user data to JWT token when user signs in
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
        role: token.role as UserRole,
      },
    }),
  },
  pages: {
    signIn: "/auth/signin", // Custom sign-in page
  },
} satisfies NextAuthConfig;