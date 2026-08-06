import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type HandlerContext = {
  params: Record<string, string>;
};

type ApiHandler = (
  req: NextRequest,
  ctx: HandlerContext
) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: ApiHandler, ...roles: string[]): ApiHandler {
  return async (req: NextRequest, ctx: HandlerContext) => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (roles.length > 0 && !roles.includes((session.user as any).role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(req, ctx);
  };
}

export function getInternalSearchParams(request: NextRequest): URLSearchParams {
  return new URL(request.url).searchParams;
}