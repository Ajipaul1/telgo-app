import { randomUUID } from "node:crypto";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MobileSession } from "@/lib/server/mobile-session";
import { createMobileNotification } from "@/lib/server/mobile-notifications";

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
  mentions?: ChatMention[];
  deletedAt?: string | null;
  deletedByName?: string | null;
  deletedByUserId?: string | null;
};

type ChatAttachment = ChatMetaAttachment | ChatImageAttachment;

export type MobileChatMember = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  loginId: string;
};

type ChatMention = {
  userId: string;
  name: string;
  loginId: string;
};

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
  mentions: ChatMention[];
  isDeleted: boolean;
  deletedAt: string | null;
  deletedByName: string | null;
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

export async function listMobileChatMembers(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("mobile_app_users")
    .select("id,email,full_name,role,login_id")
    .eq("access_status", "active")
    .is("blocked_at", null)
    .order("full_name", { ascending: true })
    .limit(100);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id ?? ""),
    name: String(row.full_name ?? "Telgo User"),
    email: row.email == null ? null : String(row.email),
    role: String(row.role ?? "engineer"),
    loginId: String(row.login_id ?? "")
  })) satisfies MobileChatMember[];
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
  const members = await listMobileChatMembers(supabase);
  const mentions = resolveMentionsFromBody(body, members).filter(
    (mention) => mention.userId !== session.userId
  );
  const attachments: ChatAttachment[] = [makeMetaAttachment(session, mentions)];

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

  await Promise.all(
    mentions.map(async (mention) => {
      try {
        await createMobileNotification(supabase, {
          recipientUserId: mention.userId,
          actorUserId: session.userId,
          title: "Tagged in team chat",
          body: `${session.fullName} mentioned you: ${makeNotificationPreview(messageBody)}`,
          notificationType: "chat",
          entityType: "chat_message",
          entityId: String(data.id ?? ""),
          metadata: {
            chatTitle: MOBILE_CHAT_TITLE,
            senderName: session.fullName,
            senderLoginId: session.loginId,
            messagePreview: makeNotificationPreview(messageBody)
          }
        });
      } catch {
        // Keep chat delivery working even if notifications are not ready yet.
      }
    })
  );

  const message = formatMessageRow(data as MessageRow, new Map());
  if (!message.images.length) return message;

  const withUrls = await listMobileChatMessages(supabase, chat.id);
  return withUrls.find((item) => item.id === message.id) ?? message;
}

export async function deleteMobileChatMessage(
  supabase: SupabaseClient,
  session: MobileSession,
  messageId: string
) {
  const { data, error } = await supabase
    .from("messages")
    .select("id,body,attachments,created_at")
    .eq("id", messageId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Chat message was not found.");

  const row = data as MessageRow;
  const message = formatMessageRow(row, new Map());
  if (message.isDeleted) return message;

  const isAdmin = session.role === "admin";
  const isOwner = message.sender.userId === session.userId;
  if (!isAdmin && !isOwner) {
    throw new Error("Only the sender or an admin can delete this message.");
  }

  const attachments = parseAttachments(row.attachments);
  const existingMeta =
    attachments.find((item): item is ChatMetaAttachment => item.type === "meta") ??
    makeMetaAttachment(session, []);
  const imagePaths = attachments
    .filter((item): item is ChatImageAttachment => item.type === "image")
    .map((item) => item.path);

  const updatedMeta: ChatMetaAttachment = {
    ...existingMeta,
    deletedAt: new Date().toISOString(),
    deletedByName: session.fullName,
    deletedByUserId: session.userId
  };

  const { data: updated, error: updateError } = await supabase
    .from("messages")
    .update({
      body: "",
      attachments: [updatedMeta]
    })
    .eq("id", messageId)
    .select("id,body,attachments,created_at")
    .single();

  if (updateError) throw updateError;

  if (imagePaths.length) {
    await supabase.storage.from(CHAT_BUCKET).remove(imagePaths);
  }

  if (isAdmin && existingMeta.senderUserId && existingMeta.senderUserId !== session.userId) {
    try {
      await createMobileNotification(supabase, {
        recipientUserId: existingMeta.senderUserId,
        actorUserId: session.userId,
        title: "Chat message removed by admin",
        body: `${session.fullName} removed one of your team chat messages.`,
        notificationType: "system",
        entityType: "chat_message",
        entityId: messageId,
        metadata: {
          chatTitle: MOBILE_CHAT_TITLE,
          deletedByRole: session.role
        }
      });
    } catch {
      // Admin moderation should still succeed even if notification storage is unavailable.
    }
  }

  return formatMessageRow(updated as MessageRow, new Map());
}

function makeMetaAttachment(session: MobileSession, mentions: ChatMention[]): ChatMetaAttachment {
  return {
    type: "meta",
    senderName: session.fullName,
    senderEmail: session.email,
    senderRole: session.role,
    senderLoginId: session.loginId,
    senderUserId: session.userId,
    mentions
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
    mentions: sender?.mentions ?? [],
    isDeleted: Boolean(sender?.deletedAt),
    deletedAt: sender?.deletedAt ?? null,
    deletedByName: sender?.deletedByName ?? null,
    images
  };
}

function parseAttachments(value: unknown): ChatAttachment[] {
  if (!Array.isArray(value)) return [];

  const attachments: ChatAttachment[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;

    if (record.type === "meta") {
      attachments.push({
        type: "meta",
        senderName: String(record.senderName ?? "Telgo User"),
        senderEmail: record.senderEmail == null ? null : String(record.senderEmail),
        senderRole: String(record.senderRole ?? "engineer"),
        senderLoginId: String(record.senderLoginId ?? ""),
        senderUserId: String(record.senderUserId ?? ""),
        mentions: parseMentions(record.mentions),
        deletedAt: record.deletedAt == null ? null : String(record.deletedAt),
        deletedByName: record.deletedByName == null ? null : String(record.deletedByName),
        deletedByUserId: record.deletedByUserId == null ? null : String(record.deletedByUserId)
      });
      continue;
    }

    if (record.type === "image" && typeof record.path === "string") {
      attachments.push({
        type: "image",
        path: record.path,
        fileName: String(record.fileName ?? path.posix.basename(record.path)),
        width: toNullableNumber(record.width),
        height: toNullableNumber(record.height),
        sizeBytes: toNullableNumber(record.sizeBytes),
        mimeType: record.mimeType == null ? null : String(record.mimeType)
      });
    }
  }

  return attachments;
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

function resolveMentionsFromBody(body: string, members: MobileChatMember[]) {
  const tokens = Array.from(body.matchAll(/(^|\s)@([A-Za-z0-9._-]+)/g))
    .map((match) => String(match[2] ?? "").trim().toUpperCase())
    .filter(Boolean);

  if (!tokens.length) return [];

  const uniqueTokens = new Set(tokens);
  return members
    .filter((member) => uniqueTokens.has(member.loginId.toUpperCase()))
    .map((member) => ({
      userId: member.id,
      name: member.name,
      loginId: member.loginId
    })) satisfies ChatMention[];
}

function parseMentions(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    if (!record.userId || !record.loginId) return [];
    return [
      {
        userId: String(record.userId),
        name: String(record.name ?? record.loginId),
        loginId: String(record.loginId)
      } satisfies ChatMention
    ];
  });
}

function makeNotificationPreview(body: string) {
  const summary = body.trim().replace(/\s+/g, " ");
  if (!summary) return "Photo attachment";
  return summary.length > 100 ? `${summary.slice(0, 97)}...` : summary;
}

function toNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
