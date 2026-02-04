import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db) as any,
  debug: process.env.NODE_ENV === "development", // Enable debug logs
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[AUTH] Authorize called with:", {
          email: credentials?.email,
          hasPassword: !!credentials?.password,
        });

        if (!credentials?.email || !credentials?.password) {
          console.error("[AUTH] Missing credentials");
          throw new Error("Geçersiz kimlik bilgileri");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        console.log("[AUTH] User found:", {
          exists: !!user,
          hasPassword: !!user?.password,
          email: user?.email,
        });

        if (!user || !user.password) {
          console.error("[AUTH] User not found or no password");
          throw new Error("Geçersiz kimlik bilgileri");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        console.log("[AUTH] Password valid:", isPasswordValid);

        if (!isPasswordValid) {
          console.error("[AUTH] Invalid password");
          throw new Error("Geçersiz kimlik bilgileri");
        }

        console.log("[AUTH] Login successful for:", user.email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
