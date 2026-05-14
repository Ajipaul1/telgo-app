import { randomUUID } from "node:crypto";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MobileSession } from "@/lib/server/mobile-session";

export const MOBILE_CHAT_TITLE = "Telgo Team Chat";
const CHAT_BUCKET = "site-photos";
const CHAT_PREFIX = "mobile-chat";

type MessageRow = {
  id: string;
  body: string;
  attachments: unknown;
  created_at: string;
};

type ChatImageAttachment = {
  type: "image";
  path: string;
  fileName: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  mimeType: string | null;
};

type ChatMetaAttachment = {
  type: "meta";
  senderName: string;
  senderEmail: string | null;
  senderRole: string;
  senderLoginId: string;
  senderUserId: string;
};

type ChatAttachment = ChatMetaAttachment | ChatImageAttachment;

export type MobileChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    name: string;
    email: string | null;
    role: string;
    loginId: string;
    userId: string;
  };
  images: Array<
    ChatImageAttachment & {
      url: string | null;
    }
  >;
};

export async function ensureMobileChat(supabase: SupabaseClient) {
  const { data: existing, error: existingError } = await supabase
    .from("chats")
    .select("id,title,created_at")
    .is("project_id", null)
    .eq("chat_type", "mobile")
    .eq("title", MOBILE_CHAT_TITLE)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from("chats")
    .insert({
      title: MOBILE_CHAT_TITLE,
      chat_type: "mobile"
    })
    .select("id,title,created_at")
    .single();

  if (createError) throw createError;
  return created;
}

export async function listMobileChatMessages(supabase: SupabaseClient, chatId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id,body,attachments,created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) throw error;

  const rows = (data ?? []).slice().reverse() as MessageRow[];
  const allImages = rows.flatMap((row) => getImageAttachments(row.attachments));
  const signedUrlMap = new Map<string, string | null>();

  await Promise.all(
    allImages.map(async (image) => {
      const { data: signed } = await supabase.storage
        .from(CHAT_BUCKET)
        .createSignedUrl(image.path, 60 * 60 * 12);
      signedUrlMap.set(image.path, signed?.signedUrl ?? null);
    })
  );

  return rows.map((row) => formatMessageRow(row, signedUrlMap));
}

export async function createMobileChatMessage(
  supabase: SupabaseClient,
  session: MobileSession,
  body: string,
  files: File[]
) {
  const chat = await ensureMobileChat(supabase);
  const attachments: ChatAttachment[] = [makeMetaAttachment(session)];

  for (const file of files) {
    const uploaded = await uploadChatImage(supabase, chat.id, file);
    attachments.push(uploaded);
  }

  const messageBody = body.trim() || " ";
  const { data, error } = await supabase
    .from("messages")
    .insert({
      chat_id: chat.id,
      body: messageBody,
      attachments
    })
    .select("id,body,attachments,created_at")
    .single();

  if (error) throw error;

  const message = formatMessageRow(data as MessageRow, new Map());
  if (!message.images.length) return message;

  const withUrls = await listMobileChatMessages(supabase, chat.id);
  return withUrls.find((item) => item.id === message.id) ?? message;
}

function makeMetaAttachment(session: MobileSession): ChatMetaAttachment {
  return {
    type: "meta",
    senderName: session.fullName,
    senderEmail: session.email,
    senderRole: session.role,
    senderLoginId: session.loginId,
    senderUserId: session.userId
  };
}

async function uploadChatImage(supabase: SupabaseClient, chatId: string, file: File) {
  const extension = getImageExtension(file);
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const filePath = path.posix.join(CHAT_PREFIX, chatId, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(CHAT_BUCKET).upload(filePath, bytes, {
    contentType: file.type || "image/jpeg",
    upsert: false
  });

  if (error) throw error;

  return {
    type: "image",
    path: filePath,
    fileName: file.name || fileName,
    width: null,
    height: null,
    sizeBytes: file.size || null,
    mimeType: file.type || "image/jpeg"
  } satisfies ChatImageAttachment;
}

function formatMessageRow(row: MessageRow, signedUrlMap: Map<string, string | null>): MobileChatMessage {
  const attachments = parseAttachments(row.attachments);
  const sender = attachments.find((item): item is ChatMetaAttachment => item.type === "meta");
  const images = attachments
    .filter((item): item is ChatImageAttachment => item.type === "image")
    .map((image) => ({
      ...image,
      url: signedUrlMap.get(image.path) ?? null
    }));

  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    sender: {
      name: sender?.senderName ?? "Telgo User",
      email: sender?.senderEmail ?? null,
      role: sender?.senderRole ?? "engineer",
      loginId: sender?.senderLoginId ?? "",
      userId: sender?.senderUserId ?? ""
    },
    images
  };
}

function parseAttachments(value: unknown): ChatAttachment[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    if (record.type === "meta") {
      return [
        {
          type: "meta",
          senderName: String(record.senderName ?? "Telgo User"),
          senderEmail: record.senderEmail == null ? null : String(record.senderEmail),
          senderRole: String(record.senderRole ?? "engineer"),
          senderLoginId: String(record.senderLoginId ?? ""),
          senderUserId: String(record.senderUserId ?? "")
        } satisfies ChatMetaAttachment
      ];
    }

    if (record.type === "image" && typeof record.path === "string") {
      return [
        {
          type: "image",
          path: record.path,
          fileName: String(record.fileName ?? path.posix.basename(record.path)),
          width: toNullableNumber(record.width),
          height: toNullableNumber(record.height),
          sizeBytes: toNullableNumber(record.sizeBytes),
          mimeType: record.mimeType == null ? null : String(record.mimeType)
        } satisfies ChatImageAttachment
      ];
    }

    return [];
  });
}

function getImageAttachments(value: unknown) {
  return parseAttachments(value).filter(
    (item): item is ChatImageAttachment => item.type === "image"
  );
}

function getImageExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function toNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
