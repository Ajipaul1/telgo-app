import { api } from "@/lib/server/api";
import { fail } from "@/lib/server/doctor";
import { storeFile, FILE_KINDS, type FileKind } from "@/lib/server/files";
import { oneOf } from "@/lib/server/validate";

// one photo, bill, PDF or voice note at a time; answers with the stored file's id
export const POST = api({ shift: true, rate: { limit: 120, seconds: 600 } }, async ({ me, req }) => {
  const form = await req.formData().catch(() => null);
  if (!form) fail(400, "INVALID", "No file was sent.");
  const file = form!.get("file");
  if (!(file instanceof File)) fail(400, "INVALID", "No file was sent.");
  const kind = oneOf(form!.get("kind"), FILE_KINDS, "Kind of file") as FileKind;
  if (kind === "avatar") fail(400, "INVALID", "Use Profile to change your photo.");
  const stored = await storeFile(me, file as File, kind);
  return { file: stored };
});
