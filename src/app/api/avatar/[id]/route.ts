import { NextResponse } from "next/server";
import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { maybe } from "@/lib/server/truth";
import { uuid } from "@/lib/server/validate";
import { openFile } from "@/lib/server/files";

// a person's profile photo: the stored file, or the picture the old app kept inside the person's row
export const GET = api({ allowMustChange: true }, async ({ me, sb, params }) => {
  const id = uuid(params.id, "Person");
  const p = await maybe<{ avatar_file_id: string | null; avatar_url: string | null; is_test: boolean }>(
    sb.from(T.users).select("avatar_file_id,avatar_url,is_test").eq("id", id).maybeSingle(), "the photo");
  if (!p || p.is_test !== me.isTest) fail(404, "NOT_FOUND", "No photo.");
  let bytes: ArrayBuffer | Uint8Array, mime: string;
  if (p!.avatar_file_id) {
    const f = await openFile(me, p!.avatar_file_id);
    bytes = await f.blob.arrayBuffer();
    mime = f.mime;
  } else {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(p!.avatar_url ?? "");
    if (!m) fail(404, "NOT_FOUND", "No photo.");
    mime = m![1];
    bytes = Buffer.from(m![2], "base64");
  }
  return new NextResponse(bytes as BodyInit, {
    headers: { "Content-Type": mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
});
