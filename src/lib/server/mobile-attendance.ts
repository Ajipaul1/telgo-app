import type { SupabaseClient } from "@supabase/supabase-js";
import { projects } from "@/lib/demo-data";
import { hasCorridor } from "@/lib/project-corridor";
import type { Project } from "@/lib/types";
import type { MobileSession } from "@/lib/server/mobile-session";
import { createMobileNotification } from "@/lib/server/mobile-notifications";

const PRIMARY_PROJECT = projects[0];

export type MobileAttendanceRecord = {
  id: string;
  mobileUserId: string;
  userName: string;
  userLoginId: string;
  userRole: string;
  projectId: string;
  projectName: string;
  checkInAt: string;
  latitude: number;
  longitude: number;
  gpsAccuracyM: number | null;
  distanceFromSiteM: number;
  withinGeofence: boolean;
  status: string;
};

export type MobileTrackedLocation = {
  id: string;
  mobileUserId: string;
  userName: string;
  userLoginId: string;
  userRole: string;
  projectId: string;
  projectName: string;
  latitude: number;
  longitude: number;
  gpsAccuracyM: number | null;
  distanceFromSiteM: number;
  withinGeofence: boolean;
  source: string;
  recordedAt: string;
};

export type MobileTrackingSnapshot = {
  project: Project;
  locations: MobileTrackedLocation[];
  attendance: MobileAttendanceRecord[];
  canViewAll: boolean;
};

type MarkMobileAttendanceInput = {
  latitude: number;
  longitude: number;
  gpsAccuracyM?: number | null;
};

export async function markMobileAttendance(
  supabase: SupabaseClient,
  session: MobileSession,
  input: MarkMobileAttendanceInput
) {
  const project = PRIMARY_PROJECT;
  const [targetLng, targetLat] = hasCorridor(project)
    ? project.corridor.startCoordinates
    : project.coordinates;
  const geofenceMeters = hasCorridor(project) ? project.corridor.geofenceMeters : 120;
  const checkInAt = new Date().toISOString();
  const distanceFromSiteM = Math.round(
    distanceMeters(input.latitude, input.longitude, targetLat, targetLng)
  );
  const withinGeofence = distanceFromSiteM <= geofenceMeters;

  const { data: attendanceRow, error: attendanceError } = await supabase
    .from("mobile_attendance")
    .insert({
      mobile_user_id: session.userId,
      user_name: session.fullName,
      user_login_id: session.loginId,
      user_role: session.role,
      project_id: project.id,
      project_name: project.name,
      check_in_at: checkInAt,
      latitude: input.latitude,
      longitude: input.longitude,
      gps_accuracy_m: input.gpsAccuracyM ?? null,
      distance_from_site_m: distanceFromSiteM,
      within_geofence: withinGeofence,
      status: withinGeofence ? "checked_in" : "outside_geofence"
    })
    .select("*")
    .single();

  if (attendanceError) throw attendanceError;

  const { data: locationRow, error: locationError } = await supabase
    .from("mobile_live_locations")
    .insert({
      mobile_user_id: session.userId,
      attendance_id: attendanceRow.id,
      user_name: session.fullName,
      user_login_id: session.loginId,
      user_role: session.role,
      project_id: project.id,
      project_name: project.name,
      latitude: input.latitude,
      longitude: input.longitude,
      gps_accuracy_m: input.gpsAccuracyM ?? null,
      distance_from_site_m: distanceFromSiteM,
      within_geofence: withinGeofence,
      source: "attendance_mark",
      recorded_at: checkInAt
    })
    .select("*")
    .single();

  if (locationError) throw locationError;

  await notifyOperationsOnAttendance(supabase, session, {
    projectName: project.name,
    distanceFromSiteM,
    withinGeofence
  });

  return {
    attendance: formatAttendanceRow(attendanceRow),
    location: formatLocationRow(locationRow),
    geofenceMeters
  };
}

export async function listMobileTrackingSnapshot(
  supabase: SupabaseClient,
  session: MobileSession
): Promise<MobileTrackingSnapshot> {
  const canViewAll = session.role === "admin" || session.role === "supervisor";

  let locationQuery = supabase
    .from("mobile_live_locations")
    .select("*")
    .eq("project_id", PRIMARY_PROJECT.id)
    .order("recorded_at", { ascending: false })
    .limit(canViewAll ? 60 : 20);

  if (!canViewAll) {
    locationQuery = locationQuery.eq("mobile_user_id", session.userId);
  }

  const { data: locationRows, error: locationError } = await locationQuery;
  if (locationError) throw locationError;

  let attendanceQuery = supabase
    .from("mobile_attendance")
    .select("*")
    .eq("project_id", PRIMARY_PROJECT.id)
    .order("check_in_at", { ascending: false })
    .limit(canViewAll ? 20 : 8);

  if (!canViewAll) {
    attendanceQuery = attendanceQuery.eq("mobile_user_id", session.userId);
  }

  const { data: attendanceRows, error: attendanceError } = await attendanceQuery;
  if (attendanceError) throw attendanceError;

  const dedupedLocations = dedupeLatestLocations(
    (locationRows ?? []).map((row) => formatLocationRow(row as Record<string, unknown>)),
    canViewAll
  );

  return {
    project: PRIMARY_PROJECT,
    locations: dedupedLocations,
    attendance: (attendanceRows ?? []).map((row) =>
      formatAttendanceRow(row as Record<string, unknown>)
    ),
    canViewAll
  };
}

async function notifyOperationsOnAttendance(
  supabase: SupabaseClient,
  session: MobileSession,
  context: {
    projectName: string;
    distanceFromSiteM: number;
    withinGeofence: boolean;
  }
) {
  const { data: opsUsers, error } = await supabase
    .from("mobile_app_users")
    .select("id,role")
    .in("role", ["admin", "supervisor"])
    .eq("access_status", "active")
    .is("blocked_at", null);

  if (error) return;

  await Promise.all(
    (opsUsers ?? [])
      .map((row) => String(row.id ?? ""))
      .filter((recipientUserId) => recipientUserId && recipientUserId !== session.userId)
      .map(async (recipientUserId) => {
        try {
          await createMobileNotification(supabase, {
            recipientUserId,
            actorUserId: session.userId,
            title: "Engineer attendance marked",
            body: `${session.fullName} marked attendance for ${context.projectName} at ${context.distanceFromSiteM} m from the site start${context.withinGeofence ? "" : " outside the geofence"}.`,
            notificationType: "attendance",
            entityType: "mobile_attendance",
            metadata: {
              userLoginId: session.loginId,
              projectId: PRIMARY_PROJECT.id,
              withinGeofence: context.withinGeofence,
              distanceFromSiteM: context.distanceFromSiteM
            }
          });
        } catch {
          // Attendance capture should continue even if notification storage is unavailable.
        }
      })
  );
}

function dedupeLatestLocations(locations: MobileTrackedLocation[], canViewAll: boolean) {
  if (!canViewAll) return locations;

  const latestByUser = new Map<string, MobileTrackedLocation>();
  for (const location of locations) {
    if (!latestByUser.has(location.mobileUserId)) {
      latestByUser.set(location.mobileUserId, location);
    }
  }
  return Array.from(latestByUser.values());
}

function formatAttendanceRow(row: Record<string, unknown>): MobileAttendanceRecord {
  return {
    id: String(row.id ?? ""),
    mobileUserId: String(row.mobile_user_id ?? ""),
    userName: String(row.user_name ?? "Telgo User"),
    userLoginId: String(row.user_login_id ?? ""),
    userRole: String(row.user_role ?? "engineer"),
    projectId: String(row.project_id ?? PRIMARY_PROJECT.id),
    projectName: String(row.project_name ?? PRIMARY_PROJECT.name),
    checkInAt: String(row.check_in_at ?? row.created_at ?? new Date().toISOString()),
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    gpsAccuracyM: row.gps_accuracy_m == null ? null : Number(row.gps_accuracy_m),
    distanceFromSiteM: Number(row.distance_from_site_m ?? 0),
    withinGeofence: Boolean(row.within_geofence),
    status: String(row.status ?? "checked_in")
  };
}

function formatLocationRow(row: Record<string, unknown>): MobileTrackedLocation {
  return {
    id: String(row.id ?? ""),
    mobileUserId: String(row.mobile_user_id ?? ""),
    userName: String(row.user_name ?? "Telgo User"),
    userLoginId: String(row.user_login_id ?? ""),
    userRole: String(row.user_role ?? "engineer"),
    projectId: String(row.project_id ?? PRIMARY_PROJECT.id),
    projectName: String(row.project_name ?? PRIMARY_PROJECT.name),
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    gpsAccuracyM: row.gps_accuracy_m == null ? null : Number(row.gps_accuracy_m),
    distanceFromSiteM: Number(row.distance_from_site_m ?? 0),
    withinGeofence: Boolean(row.within_geofence),
    source: String(row.source ?? "attendance_mark"),
    recordedAt: String(row.recorded_at ?? row.created_at ?? new Date().toISOString())
  };
}

function distanceMeters(latA: number, lngA: number, latB: number, lngB: number) {
  const earthRadiusM = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(latA)) *
      Math.cos(toRad(latB)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
