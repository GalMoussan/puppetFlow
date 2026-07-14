/**
 * Global toast notification store (Zustand)
 *
 * Lightweight alternative to sonner — no extra dependency.
 * Use `toast.success|error|info` from anywhere (React or not).
 *
 * @module lib/store/toast-store
 */

import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (message: string, type?: ToastType, duration?: number) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const DEFAULT_DURATION_MS = 3500;

let counter = 0;

function nextId(): string {
  counter += 1;
  return `toast-${Date.now()}-${counter}`;
}

/** Active auto-dismiss timers (module-level so clear/dismiss can cancel them) */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastStore>()((set, get) => ({
  toasts: [],

  add: (message, type = "info", duration = DEFAULT_DURATION_MS) => {
    const id = nextId();
    const item: ToastItem = { id, message, type, duration };

    set((state) => ({ toasts: [...state.toasts, item] }));

    if (duration > 0) {
      const handle = setTimeout(() => {
        timers.delete(id);
        get().dismiss(id);
      }, duration);
      timers.set(id, handle);
    }

    return id;
  },

  dismiss: (id) => {
    const handle = timers.get(id);
    if (handle !== undefined) {
      clearTimeout(handle);
      timers.delete(id);
    }
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clear: () => {
    for (const handle of timers.values()) {
      clearTimeout(handle);
    }
    timers.clear();
    set({ toasts: [] });
  },
}));

/** Imperative helpers — safe outside React components */
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().add(message, "success", duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().add(message, "error", duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().add(message, "info", duration),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
  clear: () => useToastStore.getState().clear(),
};
