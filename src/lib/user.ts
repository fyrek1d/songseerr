import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export function isAdmin(session: any) {
  return session?.user?.role === "admin";
}

export function isTrustedOrAdmin(session: any) {
  return session?.user?.role === "admin" || session?.user?.role === "trusted";
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export async function getUserRole() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.role || "user";
}