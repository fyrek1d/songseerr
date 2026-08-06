import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, email, password } = body;

  if (!username || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const userCount = await prisma.user.count();

  const user = await prisma.user.create({
    data: {
      username,
      email,
      hashedPassword,
      role: userCount === 0 ? "admin" : "user",
    },
    select: { id: true, username: true, email: true, role: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}