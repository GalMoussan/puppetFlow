"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";

export interface RunConfig {
  sceneCount: number;
  model: string;
  notes: string;
}

interface RunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (config: RunConfig) => void;
  templateId: string;
  templateName: string;
  isLoading?: boolean;
  error?: string;
}

const MODELS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { value: "claude-haiku-4-20250514", label: "Claude Haiku 4" },
];

export function RunModal({
  isOpen,
  onClose,
  onRun,
  templateId,
  templateName,
  isLoading = false,
  error,
}: RunModalProps) {
  const [sceneCount, setSceneCount] = useState(5);
  const [model, setModel] = useState("claude-sonnet-4-20250514");
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Clear validation error when inputs change
  useEffect(() => {
    setValidationError(null);
  }, [sceneCount, model, notes]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate scene count
    if (sceneCount < 1) {
      setValidationError("At least 1 scene");
      return;
    }
    if (sceneCount > 10) {
      setValidationError("Maximum 10 scenes");
      return;
    }

    onRun({ sceneCount, model, notes });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      data-testid="run-modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-700"
        data-testid="run-modal"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Run Template</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-sm text-zinc-400 mb-4">
          Template: <span className="text-white">{templateName}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="sceneCount" className="block text-sm font-medium text-zinc-300 mb-1">
              Scene Count
            </label>
            <input
              type="number"
              id="sceneCount"
              value={sceneCount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setSceneCount(Number.isNaN(val) ? 0 : val);
              }}
              min={1}
              max={10}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="model" className="block text-sm font-medium text-zinc-300 mb-1">
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-zinc-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes for this run..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {(validationError || error) && (
            <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">
              {validationError || error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              aria-label="Generate"
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium
                ${isLoading
                  ? "bg-green-700 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-500"}
                text-white transition-colors
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
