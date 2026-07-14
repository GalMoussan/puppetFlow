/**
 * Tests for global toast store (T503)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useToastStore, toast } from "@/lib/store/toast-store";

describe("lib/store/toast-store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.getState().clear();
  });

  afterEach(() => {
    useToastStore.getState().clear();
    vi.useRealTimers();
  });

  it("starts with no toasts", () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it("add creates a toast with message and type", () => {
    const id = useToastStore.getState().add("Hello", "success");
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({
      id,
      message: "Hello",
      type: "success",
    });
  });

  it("defaults type to info", () => {
    useToastStore.getState().add("FYI");
    expect(useToastStore.getState().toasts[0].type).toBe("info");
  });

  it("toast.success / error / info helpers work", () => {
    toast.success("Saved");
    toast.error("Failed");
    toast.info("Note");
    const types = useToastStore.getState().toasts.map((t) => t.type);
    expect(types).toEqual(["success", "error", "info"]);
  });

  it("dismiss removes a toast by id", () => {
    const id = toast.success("A");
    toast.error("B");
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe("B");
  });

  it("auto-dismisses after duration", () => {
    toast.success("Temp", 1000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("clear removes all toasts and cancels timers", () => {
    toast.success("A", 5000);
    toast.error("B", 5000);
    useToastStore.getState().clear();
    expect(useToastStore.getState().toasts).toEqual([]);
    vi.advanceTimersByTime(5000);
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it("dismiss cancels auto-dismiss timer", () => {
    const id = toast.info("X", 2000);
    useToastStore.getState().dismiss(id);
    vi.advanceTimersByTime(2000);
    expect(useToastStore.getState().toasts).toEqual([]);
  });
});
