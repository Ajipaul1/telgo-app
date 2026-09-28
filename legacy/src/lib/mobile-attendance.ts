import type { SupabaseClient } from "@supabase/supabase-js";
import { projects } from "@/lib/demo-data";
import { hasCorridor } from "@/lib/project-corridor";
import type { Project } from "@/lib/types";

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

export function formatAttendanceRow(row: Record<string, unknown>): MobileAttendanceRecord {
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
    status: String(row.status ?? "checked_in"),
  };
}

export function formatLocationRow(row: Record<string, unknown>): MobileTrackedLocation {
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
    recordedAt: String(row.recorded_at ?? row.created_at ?? new Date().toISOString()),
  };
}

export function distanceMeters(latA: number, lngA: number, latB: number, lngB: number) {
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
