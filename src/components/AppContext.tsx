"use client";
import { createContext, useContext } from "react";
import type { Role } from "@/lib/shared/roles";
import type { Shift } from "@/lib/shared/attendance";

export type MeView = {
  id: string; fullName: string; email: string | null; phone: string | null; role: Role; loginId: string; status: string;
  mustChangePassword: boolean; hasAvatar: boolean; updatedAt: string; voiceLanguage: string; isTest: boolean; lastSignIn: string | null;
};

export type Counts = Record<string, number>;

export type AppCtx = {
  me: MeView | null;
  setMe: (m: MeView) => void;
  counts: Counts;
  refreshCounts: () => void;
  toast: (msg: string, bad?: boolean) => void;
  setTitle: (t: string | null) => void;
  shift: { open: Shift | null; known: boolean; set: (s: Shift | null) => void; reload: () => Promise<void> };
};

export const Ctx = createContext<AppCtx>({
  me: null, setMe: () => {}, counts: {}, refreshCounts: () => {}, toast: () => {}, setTitle: () => {},
  shift: { open: null, known: false, set: () => {}, reload: async () => {} },
});
export const useApp = () => useContext(Ctx);
