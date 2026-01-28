import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const devAuthBypass =
  process.env.DEV_AUTH_BYPASS === "true" &&
  process.env.NODE_ENV !== "production";

type DevAuthBody = {
  userId?: string;
  mode?: "enable" | "disable" | "demo";
};

export async function POST(request: Request) {
  if (!devAuthBypass) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { userId, mode } = (await request.json()) as DevAuthBody;

  if (mode === "disable") {
    (globalThis as { __devAuthUserId?: string }).__devAuthUserId = undefined;
    const response = NextResponse.json({ ok: true });
    response.cookies.set("dev_auth_bypass", "off", {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return response;
  }

  if (mode === "enable") {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("dev_auth_bypass", "on", {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return response;
  }

  if (mode === "demo") {
    const token = randomBytes(6).toString("hex");
    const name = `Demo ${token.slice(0, 4)}`;
    const email = `demo.${token}@example.com`;
    const user = await prisma.user.create({
      data: {
        name,
        email,
      },
    });

    (globalThis as { __devAuthUserId?: string }).__devAuthUserId = user.id;
    const response = NextResponse.json({ ok: true, userId: user.id });
    response.cookies.set("dev_auth_bypass", "on", {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return response;
  }

  if (!userId) {
    (globalThis as { __devAuthUserId?: string }).__devAuthUserId = undefined;
    return NextResponse.json({ ok: true });
  }

  const exists = await prisma.user.findUnique({ where: { id: userId } });
  if (!exists) {
    return NextResponse.json({ error: "User not found" }, { status: 400 });
  }

  (globalThis as { __devAuthUserId?: string }).__devAuthUserId = userId;
  return NextResponse.json({ ok: true });
}
