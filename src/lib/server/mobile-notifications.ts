import type { SupabaseClient } from "@supabase/supabase-js";

export type MobileNotification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, unknown>;
};

type CreateMobileNotificationInput = {
  recipientUserId: string;
  actorUserId?: string | null;
  title: string;
  body?: string | null;
  notificationType?: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function listMobileNotifications(
  supabase: SupabaseClient,
  recipientUserId: string,
  limit = 20
) {
  const { data, error } = await supabase
    .from("mobile_notifications")
    .select("id,title,body,notification_type,is_read,created_at,metadata")
    .eq("recipient_user_id", recipientUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id ?? ""),
    title: String(row.title ?? "Notification"),
    body: row.body == null ? null : String(row.body),
    type: String(row.notification_type ?? "system"),
    isRead: Boolean(row.is_read),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    metadata: isRecord(row.metadata) ? row.metadata : {}
  })) satisfies MobileNotification[];
}

export async function createMobileNotification(
  supabase: SupabaseClient,
  input: CreateMobileNotificationInput
) {
  const { error } = await supabase.from("mobile_notifications").insert({
    recipient_user_id: input.recipientUserId,
    actor_user_id: input.actorUserId ?? null,
    title: input.title,
    body: input.body ?? null,
    notification_type: input.notificationType ?? "system",
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {}
  });

  if (error) throw error;
}

export async function markAllMobileNotificationsRead(
  supabase: SupabaseClient,
  recipientUserId: string
) {
  const { error } = await supabase
    .from("mobile_notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq("recipient_user_id", recipientUserId)
    .eq("is_read", false);

  if (error) throw error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
