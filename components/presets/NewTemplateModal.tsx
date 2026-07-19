/**
 * New Template Modal
 *
 * Orchestrates the full template creation flow:
 * 1. Preset selection via PresetPicker
 * 2. Name input dialog
 * 3. Template creation with preset defaults
 *
 * @module components/presets/NewTemplateModal
 */

"use client";

import { useState, useCallback } from "react";
import { X, Loader2, FileText, ArrowLeft } from "lucide-react";
import { PresetPicker } from "./PresetPicker";

// =============================================================================
// Types
// =============================================================================

interface NewTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (templateId: string) => void;
  defaultThemePackId?: string;
}

type Step = "preset" | "name";

// =============================================================================
// Component
// =============================================================================

export function NewTemplateModal({
  isOpen,
  onClose,
  onCreated,
  defaultThemePackId,
}: NewTemplateModalProps) {
  const [step, setStep] = useState<Step>("preset");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [selectedPresetName, setSelectedPresetName] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  const handleClose = useCallback(() => {
    setStep("preset");
    setSelectedPresetId(null);
    setSelectedPresetName(null);
    setTemplateName("");
    setCreating(false);
    setError(null);
    onClose();
  }, [onClose]);

  // Handle preset selection
  const handlePresetSelect = useCallback(
    (presetId: string | null, presetName: string | null) => {
      setSelectedPresetId(presetId);
      setSelectedPresetName(presetName);
      // Generate default name based on preset or blank
      const defaultName = presetName
        ? `${presetName} Template`
        : "New Template";
      setTemplateName(defaultName);
      setStep("name");
    },
    []
  );

  // Handle template creation
  const handleCreate = useCallback(async () => {
    if (!templateName.trim()) {
      setError("Please enter a template name");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/templates/from-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          presetId: selectedPresetId,
          themePackId: defaultThemePackId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create template");
      }

      const data = await response.json();
      onCreated(data.template.id);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setCreating(false);
    }
  }, [templateName, selectedPresetId, defaultThemePackId, onCreated, handleClose]);

  // Handle back to preset selection
  const handleBack = useCallback(() => {
    setStep("preset");
    setError(null);
  }, []);

  if (!isOpen) return null;

  // Step 1: Preset selection
  if (step === "preset") {
    return (
      <PresetPicker
        isOpen={true}
        onClose={handleClose}
        onSelect={handlePresetSelect}
      />
    );
  }

  // Step 2: Name input
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0b] rounded-xl border border-white/[0.08] w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
              aria-label="Back to preset selection"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Name Your Template</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Preset indicator */}
          <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
              Based on
            </p>
            <p className="text-sm text-white font-medium">
              {selectedPresetName || "Blank Template"}
            </p>
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <label
              htmlFor="template-name"
              className="block text-sm font-medium text-zinc-400"
            >
              Template Name
            </label>
            <input
              id="template-name"
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !creating) {
                  void handleCreate();
                }
              }}
              placeholder="Enter template name..."
              className="
                w-full px-4 py-2.5 rounded-lg
                bg-white/[0.03] border border-white/[0.08]
                text-white placeholder-zinc-500
                focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30
                transition-colors
              "
              autoFocus
              disabled={creating}
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={handleClose}
            disabled={creating}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || !templateName.trim()}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              flex items-center gap-2
              ${creating || !templateName.trim()
                ? "bg-white/[0.05] text-zinc-500 cursor-not-allowed"
                : "bg-cyan-500 text-black hover:bg-cyan-400"
              }
            `}
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            {creating ? "Creating..." : "Create Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
