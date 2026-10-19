import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { buildBackendAuthHeaders } from "@/lib/backend-auth";

interface Params {
  params: Promise<{ filename: string }>;
}

// Streams the user's watermark image so the picker can preview it.
export async function GET(_: Request, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;
  const apiUrl =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";
  const upstream = await fetch(
    `${apiUrl.replace(/\/$/, "")}/watermarks/${encodeURIComponent(filename)}/file`,
    { headers: { ...buildBackendAuthHeaders(session.user.id) }, cache: "no-store" },
  );

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  });
}
