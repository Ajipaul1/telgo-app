import { NextResponse } from "next/server";
import { api } from "@/lib/server/api";
import { uuid } from "@/lib/server/validate";
import { openFile } from "@/lib/server/files";

// a stored file, only for people allowed to see it (files.ts decides)
export const GET = api({}, async ({ me, params, req }) => {
  const f = await openFile(me, uuid(params.id, "File"));
  const download = req.nextUrl.searchParams.get("download") === "1";
  return new NextResponse(f.blob, {
    headers: {
      "Content-Type": f.mime,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="telgo-${params.id.slice(0, 8)}.${f.mime.split("/")[1].replace("jpeg", "jpg")}"`,
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'",
    },
  });
});
