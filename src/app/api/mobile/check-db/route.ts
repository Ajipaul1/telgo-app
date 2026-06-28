import { NextResponse } from "next/server";
import { getMobileAccessClient } from "@/lib/server/mobile-access";

export async function GET() {
  const supabase = getMobileAccessClient();
  try {
    const { data: users } = await supabase.from('mobile_app_users').select('*');
    const { data: reports } = await supabase.from('pending_daily_reports').select('*').order('created_at', { ascending: false }).limit(20);
    const { data: notifications } = await supabase.from('mobile_notifications').select('*').order('created_at', { ascending: false }).limit(20);

    return NextResponse.json({
      ok: true,
      users: users?.map(u => ({ id: u.id, name: u.full_name, role: u.role, status: u.access_status })),
      reports: reports?.map(r => ({ id: r.id, date: r.report_date, projectId: r.project_id, supervisor: r.supervisor_name, status: r.status, created: r.created_at })),
      notifications: notifications?.map(n => ({ id: n.id, recipient: n.recipient_user_id, title: n.title, body: n.body, created: n.created_at }))
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message });
  }
}
