// Files (RULES.md section 7): private storage only. A file is stored after its real type is read from
// its first bytes (the name and the phone's claim are not trusted), and it is only ever served through
// /api/files/<id> after the server checks who is asking.
import "server-only";
import { randomUUID } from "node:crypto";
import { db, T, STORAGE_BUCKET } from "./core";
import { AppError } from "./doctor";
import { must, maybe } from "./truth";
import type { Me } from "./session";

export type FileKind = "bill" | "work" | "clearance" | "avatar" | "material" | "chat" | "voice" | "other";
export const FILE_KINDS: FileKind[] = ["bill", "work", "clearance", "avatar", "material", "chat", "voice", "other"];
export const MAX_BYTES = 4 * 1024 * 1024; // what one request to the server can carry

function sniff(b: Uint8Array): { mime: string; ext: string } | null {
  const s = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && s(1, 3) === "PNG") return { mime: "image/png", ext: "png" };
  if (s(0, 4) === "RIFF" && s(8, 4) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (s(0, 4) === "%PDF") return { mime: "application/pdf", ext: "pdf" };
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { mime: "audio/webm", ext: "webm" };
  if (s(0, 4) === "OggS") return { mime: "audio/ogg", ext: "ogg" };
  if (s(4, 4) === "ftyp") {
    const brand = s(8, 4);
    if (/^(M4A |mp42|isom|iso2|M4B )/.test(brand)) return { mime: "audio/mp4", ext: "m4a" };
  }
  return null;
}

export async function storeFile(me: Me, file: File, kind: FileKind) {
  if (!FILE_KINDS.includes(kind)) throw new AppError(400, "INVALID", "Unknown kind of file.");
  if (file.size <= 0) throw new AppError(400, "INVALID", "The file is empty.");
  if (file.size > MAX_BYTES) throw new AppError(413, "TOO_BIG", `That file is ${(file.size / 1048576).toFixed(1)} MB. The most is 4 MB. Photos are made smaller by the app; a PDF must be under 4 MB.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const t = sniff(bytes);
  if (!t) throw new AppError(415, "TYPE", "Only photos (JPEG, PNG, WebP), PDFs and voice notes can be added.");
  if ((kind === "voice") !== t.mime.startsWith("audio/")) throw new AppError(415, "TYPE", kind === "voice" ? "That isn't a voice recording." : "A voice recording can only go in a chat.");
  if (kind === "avatar" && !t.mime.startsWith("image/")) throw new AppError(415, "TYPE", "A profile photo must be a photo.");
  const month = new Date().toISOString().slice(0, 7);
  const path = `${kind}/${me.id}/${month}/${randomUUID()}.${t.ext}`;
  const sb = db(me.id);
  const up = await sb.storage.from(STORAGE_BUCKET).upload(path, bytes, { contentType: t.mime, upsert: false });
  if (up.error) throw new AppError(502, "STORAGE", "The photo or file couldn't be stored. Try again.");
  const row = await must(
    sb.from(T.files).insert({
      owner_id: me.id, bucket: STORAGE_BUCKET, path, mime: t.mime, bytes: bytes.length, kind,
      original_name: (file.name || "").slice(0, 200) || null, is_test: me.isTest,
    }).select("id,mime,bytes,kind,created_at").single(),
    "the file",
  );
  return row as { id: string; mime: string; bytes: number; kind: FileKind; created_at: string };
}

type FileRow = { id: string; owner_id: string; bucket: string; path: string; mime: string; kind: FileKind; trashed_at: string | null; is_test: boolean };

// who may open a file
async function mayOpen(me: Me, f: FileRow): Promise<boolean> {
  if (f.is_test !== me.isTest) return false;
  if (me.role === "admin" || f.owner_id === me.id || f.kind === "avatar") return true;
  const sb = db(me.id);
  if (f.kind === "chat" || f.kind === "voice") {
    const m = await maybe<{ thread_id: string }>(sb.from(T.chatMessages).select("thread_id").eq("file_id", f.id).limit(1).maybeSingle(), "the file");
    if (!m) return false;
    const mem = await maybe(sb.from(T.chatMembers).select("user_id").eq("thread_id", m.thread_id).eq("user_id", me.id).is("left_at", null).maybeSingle(), "the file");
    return !!mem;
  }
  if (me.role === "finance") return ["bill", "work", "clearance", "material"].includes(f.kind);
  if (me.role === "supervisor" || me.role === "engineer") return f.kind === "material" || f.kind === "work";
  if (me.role === "client" && f.kind === "work") {
    const { data: access } = await sb.from(T.projectAccess).select("project_id").eq("user_id", me.id).is("revoked_at", null);
    const ids = (access ?? []).map((a) => a.project_id);
    if (!ids.length) return false;
    const { data } = await sb.from(T.reports).select("id").in("project_id", ids).eq("status", "approved")
      .is("trashed_at", null).filter("details", "cs", JSON.stringify({ files: [f.id] })).limit(1);
    return !!data?.length;
  }
  return false;
}

export async function openFile(me: Me, id: string) {
  const f = await maybe<FileRow>(db(me.id).from(T.files).select("id,owner_id,bucket,path,mime,kind,trashed_at,is_test").eq("id", id).maybeSingle(), "the file");
  if (!f || (f.trashed_at && me.role !== "admin")) throw new AppError(404, "NOT_FOUND", "That file doesn't exist any more.");
  if (!(await mayOpen(me, f))) throw new AppError(403, "ROLE", "Your login can't open this file.");
  const dl = await db(me.id).storage.from(f.bucket).download(f.path);
  if (dl.error || !dl.data) throw new AppError(502, "STORAGE", "The file couldn't be loaded from storage. Try again.");
  return { blob: dl.data, mime: f.mime };
}

export async function removeStored(paths: { bucket: string; path: string }[]) {
  const byBucket = new Map<string, string[]>();
  for (const p of paths) byBucket.set(p.bucket, [...(byBucket.get(p.bucket) ?? []), p.path]);
  const done: string[] = [];
  for (const [bucket, list] of byBucket) {
    const { error } = await db().storage.from(bucket).remove(list);
    if (!error) done.push(...list);
  }
  return done;
}
