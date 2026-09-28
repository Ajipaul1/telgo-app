"use client";
import { call, ApiError } from "./api";

export type Fix = { lat: number; lng: number; accuracy: number | null; at: number };

// the phone's location, with the reason in words when it can't be had
export function getPosition(opts: { timeoutMs?: number; high?: boolean } = {}): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new ApiError("This phone can't share its location with the app.", "NO_GPS"));
      return;
    }
    const once = (high: boolean, timeout: number, retry: boolean) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Number.isFinite(p.coords.accuracy) ? Math.round(p.coords.accuracy) : null, at: p.timestamp }),
        (e) => {
          if (e.code === e.PERMISSION_DENIED) {
            reject(new ApiError("Location is blocked for this app. Allow location: phone Settings → Apps → Telgo (or the browser) → Permissions → Location → Allow.", "GPS_DENIED"));
          } else if (retry) {
            once(false, 20000, false); // try once more with the rougher, faster method
          } else {
            reject(new ApiError(e.code === e.TIMEOUT ? "The phone couldn't find its location in time. Step outside, turn on Location (GPS) and try again." : "The phone couldn't find its location. Turn on Location (GPS) and try again.", "GPS_FAILED"));
          }
        },
        { enableHighAccuracy: high, timeout, maximumAge: 15000 },
      );
    once(opts.high ?? true, opts.timeoutMs ?? 15000, true);
  });
}

// a photo made small enough to send (longest side 1600 px, JPEG): the phone does it, not the server
export async function shrinkImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => bad(new ApiError("That photo can't be opened. Take it again or choose another.", "BAD_PHOTO"));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], (file.name || "photo").replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type Stored = { id: string; mime: string; bytes: number; kind: string };

// one file to the server; photos are made small first
export async function uploadFile(file: File, kind: string): Promise<Stored> {
  const f = file.type.startsWith("image/") ? await shrinkImage(file) : file;
  if (f.size > 4 * 1024 * 1024) throw new ApiError(`That file is ${(f.size / 1048576).toFixed(1)} MB. The most is 4 MB.`, "TOO_BIG");
  const form = new FormData();
  form.append("file", f);
  form.append("kind", kind);
  const r = await call<{ file: Stored }>("/api/files", { form, timeoutMs: 60000 });
  return r.file;
}

export const fileUrl = (id: string) => `/api/files/${id}`;
export const avatarUrl = (userId: string, v?: string) => `/api/avatar/${userId}${v ? `?v=${encodeURIComponent(v)}` : ""}`;
