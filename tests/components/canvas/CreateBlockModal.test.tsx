/**
 * Tests for Create Block UI
 *
 * Phase 4 - T404: Create Block UI
 *
 * Tests cover:
 * - Modal opening/closing
 * - Form validation
 * - Block type and stage scope interactions
 * - Successful creation flow
 * - Error handling
 *
 * Coverage target: >= 80% line coverage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// These imports will fail until implementation exists - expected for TDD
import { CreateBlockButton } from "@/components/canvas/CreateBlockButton";
import { CreateBlockModal } from "@/components/canvas/CreateBlockModal";

import {
  createMockCanvasStore,
  createLaneNodes,
  type MockCanvasStore,
} from "@/tests/mocks/canvas-fixtures";

// =============================================================================
// Mock Setup
// =============================================================================

let mockStore: MockCanvasStore;

vi.mock("@/lib/store/canvas-store", () => ({
  useCanvasStore: vi.fn((selector?: (state: MockCanvasStore) => unknown) => {
    if (typeof selector === "function") {
      return selector(mockStore);
    }
    return mockStore;
  }),
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// =============================================================================
// Test Suite: CreateBlockButton
// =============================================================================

describe("CreateBlockButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = createMockCanvasStore({
      nodes: createLaneNodes(),
      themePackId: "pack-001",
    });
  });

  it("renders create button", () => {
    render(<CreateBlockButton />);

    expect(
      screen.getByRole("button", { name: /create block/i })
    ).toBeInTheDocument();
  });

  it("opens modal when clicked", async () => {
    const user = userEvent.setup();
    render(<CreateBlockButton />);

    await user.click(screen.getByRole("button", { name: /create block/i }));

    expect(screen.getByTestId("create-block-modal")).toBeInTheDocument();
  });
});

// =============================================================================
// Test Suite: CreateBlockModal
// =============================================================================

describe("CreateBlockModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCreated: vi.fn(),
    themePackId: "pack-001",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  // ===========================================================================
  // Form Fields
  // ===========================================================================

  describe("Form Fields", () => {
    it("renders name field", () => {
      render(<CreateBlockModal {...defaultProps} />);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    it("renders type dropdown", () => {
      render(<CreateBlockModal {...defaultProps} />);

      const typeSelect = screen.getByLabelText(/type/i);
      expect(typeSelect).toBeInTheDocument();
    });

    it("renders type options", async () => {
      render(<CreateBlockModal {...defaultProps} />);

      const typeSelect = screen.getByLabelText(/type/i);

      // Check options are present in the select
      expect(typeSelect).toContainHTML("Hook");
      expect(typeSelect).toContainHTML("Camera");
      expect(typeSelect).toContainHTML("Puppet");
    });

    it("renders prompt fragment textarea", () => {
      render(<CreateBlockModal {...defaultProps} />);

      expect(screen.getByLabelText(/prompt fragment/i)).toBeInTheDocument();
    });

    it("renders stage scope checkboxes", () => {
      render(<CreateBlockModal {...defaultProps} />);

      expect(screen.getByLabelText(/global/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^image$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/video start/i)).toBeInTheDocument();
    });

    it("renders rotation group field (optional)", () => {
      render(<CreateBlockModal {...defaultProps} />);

      expect(screen.getByLabelText(/rotation group/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Validation
  // ===========================================================================

  describe("Form Validation", () => {
    it("shows error when name is too short", async () => {
      const user = userEvent.setup();
      render(<CreateBlockModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "ab");

      const createButton = screen.getByRole("button", { name: /create/i });
      await user.click(createButton);

      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
      expect(defaultProps.onCreated).not.toHaveBeenCalled();
    });

    it("shows error when name is too long", async () => {
      const user = userEvent.setup();
      render(<CreateBlockModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "a".repeat(51));

      const createButton = screen.getByRole("button", { name: /create/i });
      await user.click(createButton);

      expect(screen.getByText(/maximum 50 characters/i)).toBeInTheDocument();
    });

    it("shows error when prompt fragment is too short", async () => {
      const user = userEvent.setup();
      render(<CreateBlockModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "Valid Name");

      const promptInput = screen.getByLabelText(/prompt fragment/i);
      await user.type(promptInput, "short");

      const createButton = screen.getByRole("button", { name: /create/i });
      await user.click(createButton);

      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });

    it("shows error when no stage scope selected", async () => {
      const user = userEvent.setup();
      render(<CreateBlockModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "Valid Name");

      const promptInput = screen.getByLabelText(/prompt fragment/i);
      await user.type(promptInput, "This is a valid prompt fragment");

      // Uncheck all default scopes (HOOK may preselect GLOBAL + IMAGE)
      const stageLabels = [/global/i, /image/i, /video start/i, /video middle/i, /video end/i];
      for (const label of stageLabels) {
        const box = screen.getByLabelText(label);
        if ((box as HTMLInputElement).checked) {
          await user.click(box);
        }
      }

      const form = nameInput.closest("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/at least one stage scope/i)).toBeInTheDocument();
      });
    });

    it("shows error for duplicate name", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: "Block name already exists" }),
      });

      render(<CreateBlockModal {...defaultProps} />);

      // Fill all required fields (GLOBAL is already selected for HOOK type)
      await user.type(screen.getByLabelText(/name/i), "Existing Block");
      await user.type(
        screen.getByLabelText(/prompt fragment/i),
        "This is a valid prompt fragment"
      );
      // Don't click Global - it's already checked for HOOK type

      const createButton = screen.getByRole("button", { name: /create/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/already exists/i)).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Block Type Interactions
  // ===========================================================================

  describe("Block Type Interactions", () => {
    it("suggests IMAGE scope for CAMERA_MOVE type", async () => {
      const user = userEvent.setup();
      render(<CreateBlockModal {...defaultProps} />);

      const typeSelect = screen.getByLabelText(/type/i);
      await user.selectOptions(typeSelect, "CAMERA_MOVE");

      // IMAGE checkbox should be auto-selected
      expect(screen.getByLabelText(/image/i)).toBeChecked();
    });

    it("suggests VIDEO scopes for PUPPET_DYNAMIC type", async () => {
      const user = userEvent.setup();
      render(<CreateBlockModal {...defaultProps} />);

      const typeSelect = screen.getByLabelText(/type/i);
      await user.selectOptions(typeSelect, "PUPPET_DYNAMIC");

      // VIDEO scopes should be auto-selected
      expect(screen.getByLabelText(/video start/i)).toBeChecked();
      expect(screen.getByLabelText(/video middle/i)).toBeChecked();
      expect(screen.getByLabelText(/video end/i)).toBeChecked();
    });

    it("suggests GLOBAL scope for HOOK type", async () => {
      const user = userEvent.setup();
      render(<CreateBlockModal {...defaultProps} />);

      const typeSelect = screen.getByLabelText(/type/i);
      await user.selectOptions(typeSelect, "HOOK");

      expect(screen.getByLabelText(/global/i)).toBeChecked();
    });
  });

  // ===========================================================================
  // Block Preview
  // ===========================================================================

  describe("Block Preview", () => {
    it("shows preview as user types", async () => {
      const user = userEvent.setup();
      render(<CreateBlockModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, "My New Block");

      expect(screen.getByTestId("block-preview")).toHaveTextContent(
        "My New Block"
      );
    });

    it("preview updates with type", async () => {
      const user = userEvent.setup();
      render(<CreateBlockModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/name/i), "Test Block");
      await user.selectOptions(screen.getByLabelText(/type/i), "HOOK");

      const preview = screen.getByTestId("block-preview");
      expect(preview).toHaveAttribute("data-type", "HOOK");
    });
  });

  // ===========================================================================
  // Successful Creation
  // ===========================================================================

  describe("Successful Creation", () => {
    it("calls API with correct data", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "block-new",
            name: "New Camera Move",
            type: "CAMERA_MOVE",
          }),
      });

      render(<CreateBlockModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/name/i), "New Camera Move");
      await user.selectOptions(screen.getByLabelText(/type/i), "CAMERA_MOVE");
      await user.type(
        screen.getByLabelText(/prompt fragment/i),
        "Slow push in from medium shot"
      );
      // Don't click IMAGE - it's auto-selected when CAMERA_MOVE is chosen

      await user.click(screen.getByRole("button", { name: /create/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/blocks",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("New Camera Move"),
          })
        );
      });
    });

    it("calls onCreated with new block", async () => {
      const user = userEvent.setup();
      const newBlock = {
        id: "block-new",
        name: "New Camera Move",
        type: "CAMERA_MOVE",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newBlock),
      });

      render(<CreateBlockModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/name/i), "New Camera Move");
      await user.selectOptions(screen.getByLabelText(/type/i), "CAMERA_MOVE");
      await user.type(
        screen.getByLabelText(/prompt fragment/i),
        "Slow push in from medium shot"
      );
      // Don't click IMAGE - it's auto-selected when CAMERA_MOVE is chosen

      await user.click(screen.getByRole("button", { name: /create/i }));

      await waitFor(() => {
        expect(defaultProps.onCreated).toHaveBeenCalledWith(newBlock);
      });
    });

    it("closes modal on successful creation", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ id: "block-new", name: "New Block", type: "HOOK" }),
      });

      render(<CreateBlockModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/name/i), "New Block");
      await user.type(
        screen.getByLabelText(/prompt fragment/i),
        "A valid prompt fragment"
      );
      // Don't click GLOBAL - it's already checked for HOOK type

      await user.click(screen.getByRole("button", { name: /create/i }));

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // Modal Controls
  // ===========================================================================

  describe("Modal Controls", () => {
    it("closes when Cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<CreateBlockModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("closes when clicking outside", async () => {
      const user = userEvent.setup();
      render(<CreateBlockModal {...defaultProps} />);

      const backdrop = screen.getByTestId("create-block-modal-backdrop");
      await user.click(backdrop);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("disables Create button while submitting", async () => {
      const user = userEvent.setup();
      // Never resolve the fetch to keep it loading
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<CreateBlockModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/name/i), "Valid Block");
      await user.type(
        screen.getByLabelText(/prompt fragment/i),
        "A valid prompt fragment"
      );
      // Don't click GLOBAL - it's already checked for HOOK type

      await user.click(screen.getByRole("button", { name: /create/i }));

      expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe("Error Handling", () => {
    it("shows error message on network failure", async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<CreateBlockModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/name/i), "Valid Block");
      await user.type(
        screen.getByLabelText(/prompt fragment/i),
        "A valid prompt fragment"
      );
      // Don't click GLOBAL - it's already checked for HOOK type

      await user.click(screen.getByRole("button", { name: /create/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it("shows retry button on error", async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<CreateBlockModal {...defaultProps} />);

      await user.type(screen.getByLabelText(/name/i), "Valid Block");
      await user.type(
        screen.getByLabelText(/prompt fragment/i),
        "A valid prompt fragment"
      );
      // Don't click GLOBAL - it's already checked for HOOK type

      await user.click(screen.getByRole("button", { name: /create/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /retry/i })
        ).toBeInTheDocument();
      });
    });
  });
});
