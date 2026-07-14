/**
 * Tests for Toaster UI (T503)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "@/components/ui/Toaster";
import { useToastStore, toast } from "@/lib/store/toast-store";

/** duration 0 = no auto-dismiss (avoids act warnings after test ends) */
const sticky = 0;

describe("Toaster", () => {
  beforeEach(() => {
    useToastStore.getState().clear();
  });

  afterEach(() => {
    useToastStore.getState().clear();
  });

  it("renders nothing when no toasts", () => {
    render(<Toaster />);
    expect(screen.queryByTestId("toaster")).not.toBeInTheDocument();
  });

  it("renders toast messages from the store", async () => {
    render(<Toaster />);

    act(() => {
      toast.success("Template saved", sticky);
    });

    expect(await screen.findByTestId("toaster")).toBeInTheDocument();
    expect(screen.getByText("Template saved")).toBeInTheDocument();
    expect(screen.getByTestId("toast-success")).toBeInTheDocument();
  });

  it("renders error toast with error styling marker", async () => {
    render(<Toaster />);

    act(() => {
      toast.error("Failed to start run", sticky);
    });

    expect(await screen.findByTestId("toast-error")).toBeInTheDocument();
    expect(screen.getByText("Failed to start run")).toBeInTheDocument();
  });

  it("dismisses toast when close is clicked", async () => {
    const user = userEvent.setup();
    render(<Toaster />);

    act(() => {
      toast.info("Dismiss me", sticky);
    });

    expect(await screen.findByText("Dismiss me")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /dismiss/i }));

    await waitFor(() => {
      expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument();
    });
  });

  it("stacks multiple toasts", async () => {
    render(<Toaster />);

    act(() => {
      toast.success("One", sticky);
      toast.error("Two", sticky);
    });

    expect(await screen.findByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });
});
