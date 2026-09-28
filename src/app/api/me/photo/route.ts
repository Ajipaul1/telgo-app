import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { must } from "@/lib/server/truth";
import { storeFile } from "@/lib/server/files";
import { PERSON_COLS, personView, type PersonRow } from "@/lib/server/people";

// a new profile photo (the phone sends it already cropped and made small)
export const POST = api({ allowMustChange: true, rate: { limit: 20, seconds: 600 } }, async ({ me, sb, req }) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) fail(400, "INVALID", "Choose a photo.");
  const stored = await storeFile(me, file as File, "avatar");
  const row = await must(sb.from(T.users).update({ avatar_file_id: stored.id }).eq("id", me.id).select(PERSON_COLS).single(), "your photo");
  return { me: personView(row as unknown as PersonRow) };
});
