"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";

export interface RunConfig {
  sceneCount: number;
  model: string;
  notes: string;
  loopMode: boolean;
  languages: { hi: number; ja: number };
  historyStrictness: "hard-fail" | "warn";
  runDate: string;
}

interface RunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (config: RunConfig) => void;
  templateId: string;
  templateName: string;
  isLoading?: boolean;
  error?: string;
  /** Optional defaults from canvas store runConfig */
  defaults?: Partial<RunConfig>;
}

const MODELS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { value: "claude-haiku-4-20250514", label: "Claude Haiku 4" },
];

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RunModal({
  isOpen,
  onClose,
  onRun,
  templateId,
  templateName,
  isLoading = false,
  error,
  defaults,
}: RunModalProps) {
  const [sceneCount, setSceneCount] = useState(defaults?.sceneCount ?? 5);
  const [model, setModel] = useState(defaults?.model ?? "claude-sonnet-4-20250514");
  const [notes, setNotes] = useState(defaults?.notes ?? "");
  const [loopMode, setLoopMode] = useState(defaults?.loopMode ?? true);
  const [hiWeight, setHiWeight] = useState(defaults?.languages?.hi ?? 3);
  const [jaWeight, setJaWeight] = useState(defaults?.languages?.ja ?? 2);
  const [historyStrictness, setHistoryStrictness] = useState<"hard-fail" | "warn">(
    defaults?.historyStrictness ?? "warn"
  );
  const [runDate, setRunDate] = useState(defaults?.runDate ?? todayISODate());
  const [validationError, setValidationError] = useState<string | null>(null);

  // Clear validation error when inputs change
  useEffect(() => {
    setValidationError(null);
  }, [sceneCount, model, notes, loopMode, hiWeight, jaWeight, historyStrictness, runDate]);

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

    if (hiWeight < 0 || jaWeight < 0) {
      setValidationError("Language weights must be non-negative");
      return;
    }

    if (hiWeight + jaWeight > sceneCount) {
      setValidationError("Language weights cannot exceed scene count");
      return;
    }

    onRun({
      sceneCount,
      model,
      notes,
      loopMode,
      languages: { hi: hiWeight, ja: jaWeight },
      historyStrictness,
      runDate,
    });
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
        className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-700 max-h-[90vh] overflow-y-auto"
        data-testid="run-modal"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Run Template</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-sm text-zinc-400 mb-4">
          Template: <span className="text-white">{templateName}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="runDate" className="block text-sm font-medium text-zinc-300 mb-1">
              Run Date
            </label>
            <input
              type="date"
              id="runDate"
              value={runDate}
              onChange={(e) => setRunDate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

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

          <div className="flex items-center justify-between gap-3">
            <label htmlFor="loopMode" className="text-sm font-medium text-zinc-300">
              Loop Mode
            </label>
            <input
              type="checkbox"
              id="loopMode"
              checked={loopMode}
              onChange={(e) => setLoopMode(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-green-500 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="langHi" className="block text-sm font-medium text-zinc-300 mb-1">
                Hindi weight
              </label>
              <input
                type="number"
                id="langHi"
                value={hiWeight}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setHiWeight(Number.isNaN(val) ? 0 : val);
                }}
                min={0}
                max={10}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label htmlFor="langJa" className="block text-sm font-medium text-zinc-300 mb-1">
                Japanese weight
              </label>
              <input
                type="number"
                id="langJa"
                value={jaWeight}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setJaWeight(Number.isNaN(val) ? 0 : val);
                }}
                min={0}
                max={10}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="historyStrictness"
              className="block text-sm font-medium text-zinc-300 mb-1"
            >
              History Strictness
            </label>
            <select
              id="historyStrictness"
              value={historyStrictness}
              onChange={(e) =>
                setHistoryStrictness(e.target.value as "hard-fail" | "warn")
              }
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="warn">Warn on history collision</option>
              <option value="hard-fail">Hard-fail on history collision</option>
            </select>
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

          {/* templateId available for future display; kept for API callers */}
          <input type="hidden" name="templateId" value={templateId} readOnly />

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
