"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OfflineItem = {
  id: string;
  type: "site_log" | "photo" | "expense" | "attendance" | "document" | "message";
  title: string;
  size: string;
  status: "pending" | "syncing" | "synced" | "failed";
  createdAt: string;
  payload: Record<string, unknown>;
};

type OfflineState = {
  items: OfflineItem[];
  addItem: (item: Omit<OfflineItem, "id" | "createdAt" | "status">) => string;
  markSynced: (id: string) => void;
  clearSynced: () => void;
  clearAll: () => void;
};

const initialItems: OfflineItem[] = [
  {
    id: "offline-log-1",
    type: "site_log",
    title: "Daily Site Logs",
    size: "2.4 MB",
    status: "pending",
    createdAt: "Today, 08:30 AM",
    payload: { count: 5 }
  },
  {
    id: "offline-photo-1",
    type: "photo",
    title: "Site Photos",
    size: "18.7 MB",
    status: "syncing",
    createdAt: "Today, 08:28 AM",
    payload: { count: 12 }
  },
  {
    id: "offline-fin-1",
    type: "expense",
    title: "Finance Requests",
    size: "2.4 MB",
    status: "pending",
    createdAt: "Today, 08:15 AM",
    payload: { count: 3 }
  }
];

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      items: initialItems,
      addItem: (item) => {
        const id = `${item.type}-${Date.now()}`;
        set((state) => ({
          items: [
            {
              id,
              createdAt: new Date().toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
              }),
              status: "pending",
              ...item
            },
            ...state.items
          ]
        }));
        return id;
      },
      markSynced: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, status: "synced" } : item
          )
        })),
      clearSynced: () =>
        set((state) => ({
          items: state.items.filter((item) => item.status !== "synced")
        })),
      clearAll: () => set({ items: [] })
    }),
    {
      name: "telgo-offline-queue",
      version: 1
    }
  )
);
