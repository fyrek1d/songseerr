import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const GET = withAuth(async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
      _count: { select: { requests: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}, "admin");

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { username, email, password, role } = body;

  if (!username || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }
  const newRole = role || "user";
  if (!["admin", "trusted", "user"].includes(newRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      hashedPassword,
      role: newRole,
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
      _count: { select: { requests: true } },
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}, "admin");
