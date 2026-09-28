import "server-only";
import { db } from "./core";
import { fromDb } from "./doctor";
import { removeStored } from "./files";

// Deletes for good what has been 90 days in the Trash: first the photos and files from storage,
// then the rows (telgo_purge_trash). Run by the daily job and when the File manager opens.
export async function purgeTrash() {
  const sb = db();
  const { data: due, error } = await sb.rpc("telgo_purge_files_due");
  if (error) throw fromDb(error, "the clean-up");
  const files = (due ?? []) as { id: string; bucket: string; path: string }[];
  const removed = files.length ? await removeStored(files) : [];
  const ids = files.filter((f) => removed.includes(f.path)).map((f) => f.id);
  const { data, error: e2 } = await sb.rpc("telgo_purge_trash", { p_file_ids: ids });
  if (e2) throw fromDb(e2, "the clean-up");
  return data as Record<string, number>;
}
