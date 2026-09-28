"use client";
import { ApiError } from "@/lib/client/api";

// a profile photo: the centred square of the picture, 512 × 512 px, JPEG (the phone does it, not the server)
export async function squarePhoto(file: File, side = 512, quality = 0.86): Promise<File> {
  if (file.type && !file.type.startsWith("image/")) throw new ApiError("That isn't a photo. Choose a photo from the gallery.", "BAD_PHOTO");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => bad(new ApiError("That photo can't be opened. Take it again or choose another.", "BAD_PHOTO"));
      i.src = url;
    });
    const w = img.naturalWidth, h = img.naturalHeight;
    const s = Math.min(w, h);
    if (!s) throw new ApiError("That photo is empty. Take it again or choose another.", "BAD_PHOTO");
    const c = document.createElement("canvas");
    c.width = side; c.height = side;
    const g = c.getContext("2d");
    if (!g) throw new ApiError("This phone couldn't prepare the photo. Try again.", "BAD_PHOTO");
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, side, side);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", quality));
    if (!blob) throw new ApiError("This phone couldn't prepare the photo. Try again.", "BAD_PHOTO");
    return new File([blob], "profile.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
