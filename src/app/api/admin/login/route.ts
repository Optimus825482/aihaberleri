import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-key-change-this",
);

/**
 * POST /api/admin/login
 * Simple login without CSRF - just email/password
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    console.log("[SIMPLE_LOGIN] Attempting login for:", email);

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-posta ve şifre gereklidir" },
        { status: 400 },
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
      },
    });

    console.log("[SIMPLE_LOGIN] User found:", {
      exists: !!user,
      hasPassword: !!user?.password,
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Geçersiz e-posta veya şifre" },
        { status: 401 },
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    console.log("[SIMPLE_LOGIN] Password valid:", isPasswordValid);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Geçersiz e-posta veya şifre" },
        { status: 401 },
      );
    }

    // Create JWT token
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(JWT_SECRET);

    console.log("[SIMPLE_LOGIN] Token created, setting cookie");

    // Set cookie
    cookies().set("admin-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    console.log("[SIMPLE_LOGIN] Login successful for:", user.email);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[SIMPLE_LOGIN] Error:", error);
    return NextResponse.json(
      { error: "Giriş yapılırken bir hata oluştu" },
      { status: 500 },
    );
  }
}
