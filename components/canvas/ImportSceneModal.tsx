"use client";

import { useMemo, useState } from "react";
import { X, Loader2, FileInput, Sparkles } from "lucide-react";
import { importSceneFromMarkdown } from "@/packages/domain/scene-import";
import type { CanvasGraph } from "@/packages/domain/types";

export interface ImportedBlockSummary {
  id: string;
  type: string;
  name: string;
  promptFragment: string;
  stageScope: string[];
  rotationGroup?: string | null;
}

export interface ImportSceneResult {
  blocks: ImportedBlockSummary[];
  graph: CanvasGraph;
  warnings: string[];
  stats: {
    stages: string[];
    blockCount: number;
    created: number;
    reused: number;
  };
}

interface ImportSceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  themePackId: string;
  onImported: (result: ImportSceneResult) => void;
}

export function ImportSceneModal({
  isOpen,
  onClose,
  themePackId,
  onImported,
}: ImportSceneModalProps) {
  const [raw, setRaw] = useState("");
  const [pinLocks, setPinLocks] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    if (!raw.trim()) return null;
    try {
      return importSceneFromMarkdown(raw, { pinCharacterLocks: pinLocks });
    } catch {
      return null;
    }
  }, [raw, pinLocks]);

  if (!isOpen) return null;

  const handleImport = async () => {
    if (!raw.trim()) {
      setError("Paste a scene first");
      return;
    }
    if (!themePackId) {
      setError("No theme pack loaded");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/import/scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw,
          themePackId,
          pinCharacterLocks: pinLocks,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as ImportSceneResult & {
        error?: string;
        warnings?: string[];
      };
      if (!res.ok) {
        throw new Error(
          data.error ||
            (data.warnings?.length ? data.warnings.join("; ") : "Import failed")
        );
      }
      onImported(data as ImportSceneResult);
      setRaw("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      data-testid="import-scene-backdrop"
      onClick={handleBackdrop}
    >
      <div
        className="bg-[#0a0a0b]/95 rounded-2xl p-6 w-full max-w-2xl border border-white/[0.1] max-h-[90vh] overflow-y-auto shadow-[0_0_60px_rgba(34,211,238,0.08)]"
        data-testid="import-scene-modal"
      >
        <div className="flex justify-between items-start mb-4 gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              <FileInput className="w-5 h-5 text-cyan-400" aria-hidden />
              Import scene
            </h2>
            <p className="text-xs text-zinc-500 mt-1 max-w-md leading-relaxed">
              Paste a full scene (Image + START + MIDDLE + END). We extract
              character locks, cameras, chaos, hooks, and payoffs into reusable
              blocks and rebuild the canvas flow.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Scene markdown
        </label>
        <textarea
          data-testid="import-scene-textarea"
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setError(null);
          }}
          rows={12}
          placeholder={`## Image Prompt\n...\n\n## Video Prompt — START\n...\n\n## Extend Prompt 1 — MIDDLE\n...\n\n## Extend Prompt 2 — END\n...`}
          className="w-full bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-y min-h-[200px]"
        />

        <label className="flex items-center gap-2 mt-3 text-sm text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={pinLocks}
            onChange={(e) => setPinLocks(e.target.checked)}
            className="rounded border-white/20 bg-black text-cyan-500 focus:ring-cyan-500/40"
          />
          Pin character locks on canvas
        </label>

        {preview && preview.plan.blocks.length > 0 && (
          <div
            className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
            data-testid="import-scene-preview"
          >
            <div className="flex items-center gap-2 text-xs text-cyan-400/90 mb-2 font-medium">
              <Sparkles className="w-3.5 h-3.5" aria-hidden />
              Preview · {preview.plan.stats.blockCount} blocks · stages:{" "}
              {preview.plan.stats.stages.join(", ") || "—"}
            </div>
            <ul className="max-h-36 overflow-y-auto space-y-1.5 text-xs">
              {preview.plan.blocks.map((b) => (
                <li
                  key={b.tempId}
                  className="flex gap-2 text-zinc-400 border-b border-white/[0.04] pb-1"
                >
                  <span className="text-cyan-500/80 font-mono shrink-0 w-28 truncate">
                    {b.type}
                  </span>
                  <span className="text-zinc-500 shrink-0 w-16">{b.lane}</span>
                  <span className="text-zinc-300 truncate">{b.name}</span>
                </li>
              ))}
            </ul>
            {preview.plan.warnings.length > 0 && (
              <p className="text-[11px] text-amber-400/80 mt-2">
                {preview.plan.warnings.slice(0, 3).join(" · ")}
                {preview.plan.warnings.length > 3 ? " …" : ""}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="pf-btn pf-btn-secondary flex-1 px-4 py-2.5"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="import-scene-submit"
            disabled={isSubmitting || !raw.trim()}
            onClick={() => void handleImport()}
            className="pf-btn pf-btn-primary flex-1 px-4 py-2.5 font-semibold disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing…
              </>
            ) : (
              "Import & build flow"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
