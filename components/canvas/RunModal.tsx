"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";

export type PacingStyle = "normal" | "fast" | "slow" | "chaotic";
export type HookStyle = "question" | "shock" | "intrigue" | "direct";
export type TargetPlatform = "tiktok" | "reels" | "shorts" | "generic";

export interface RunConfig {
  sceneCount: number;
  model: string;
  notes: string;
  loopMode: boolean;
  languages: { hi: number; ja: number };
  historyStrictness: "hard-fail" | "warn";
  runDate: string;
  // Preset-aware extended config
  pacingStyle: PacingStyle;
  beatInterval: number;
  targetPlatform: TargetPlatform;
  hookStyle?: HookStyle;
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

interface LlmModelOption {
  value: string;
  label: string;
}

interface LlmStatus {
  provider: string;
  hasKey: boolean;
  defaultModel: string;
  models: LlmModelOption[];
}

const FALLBACK_ANTHROPIC: LlmModelOption[] = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { value: "claude-haiku-4-20250514", label: "Claude Haiku 4" },
];

const FALLBACK_DEEPSEEK: LlmModelOption[] = [
  { value: "deepseek-chat", label: "DeepSeek Chat" },
  { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
];

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Split scene count into hi/ja weights that always sum to sceneCount (~60/40). */
export function splitLanguageWeights(sceneCount: number): {
  hi: number;
  ja: number;
} {
  if (sceneCount <= 0) return { hi: 0, ja: 0 };
  if (sceneCount === 1) return { hi: 1, ja: 0 };
  const hi = Math.max(1, Math.round(sceneCount * 0.6));
  const ja = sceneCount - hi;
  return { hi, ja: Math.max(0, ja) };
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
  const initialScenes = defaults?.sceneCount ?? 5;
  // Prefer stored language split only when it still sums to scene count
  const initialLang = (() => {
    const stored = defaults?.languages;
    if (
      stored &&
      stored.hi + stored.ja === initialScenes &&
      stored.hi >= 0 &&
      stored.ja >= 0
    ) {
      return stored;
    }
    return splitLanguageWeights(initialScenes);
  })();

  const [sceneCount, setSceneCount] = useState(initialScenes);
  const [model, setModel] = useState(defaults?.model ?? "deepseek-chat");
  const [notes, setNotes] = useState(defaults?.notes ?? "");
  const [loopMode, setLoopMode] = useState(defaults?.loopMode ?? true);
  const [hiWeight, setHiWeight] = useState(initialLang.hi);
  const [jaWeight, setJaWeight] = useState(initialLang.ja);
  const [historyStrictness, setHistoryStrictness] = useState<
    "hard-fail" | "warn"
  >(defaults?.historyStrictness ?? "warn");
  const [runDate, setRunDate] = useState(defaults?.runDate ?? todayISODate());
  const [pacingStyle, setPacingStyle] = useState<PacingStyle>(
    defaults?.pacingStyle ?? "normal"
  );
  const [beatInterval, setBeatInterval] = useState(defaults?.beatInterval ?? 2);
  const [targetPlatform, setTargetPlatform] = useState<TargetPlatform>(
    defaults?.targetPlatform ?? "tiktok"
  );
  const [hookStyle, setHookStyle] = useState<HookStyle | "">(
    defaults?.hookStyle ?? ""
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [models, setModels] = useState<LlmModelOption[]>(FALLBACK_DEEPSEEK);
  const [provider, setProvider] = useState<string>("deepseek");
  const [hasKey, setHasKey] = useState(true);

  const clearValidation = () => setValidationError(null);

  const applySceneCount = useCallback((n: number) => {
    setSceneCount(n);
    if (n >= 1 && n <= 10) {
      const { hi, ja } = splitLanguageWeights(n);
      setHiWeight(hi);
      setJaWeight(ja);
    }
    clearValidation();
  }, []);

  // Load provider + model list when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/llm/status");
          if (!res.ok) return;
          const data = (await res.json()) as LlmStatus;
          if (cancelled) return;
          setProvider(data.provider);
          setHasKey(data.hasKey);
          setModels(
            data.models?.length
              ? data.models
              : data.provider === "deepseek"
                ? FALLBACK_DEEPSEEK
                : FALLBACK_ANTHROPIC
          );
          setModel((prev) => {
            const preferred = data.defaultModel || data.models?.[0]?.value;
            if (preferred && data.models?.some((m) => m.value === preferred)) {
              return preferred;
            }
            // Keep previous if still valid
            if (data.models?.some((m) => m.value === prev)) return prev;
            return preferred || prev;
          });
        } catch {
          // keep fallbacks
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

    // Auto-fit languages if they don't match scene count
    let hi = hiWeight;
    let ja = jaWeight;
    if (hi + ja !== sceneCount) {
      const fitted = splitLanguageWeights(sceneCount);
      hi = fitted.hi;
      ja = fitted.ja;
      setHiWeight(hi);
      setJaWeight(ja);
    }

    if (!hasKey) {
      setValidationError(
        "No LLM API key configured. Add DEEPSEEK_API_KEY (or ANTHROPIC_API_KEY) to .env and restart."
      );
      return;
    }

    onRun({
      sceneCount,
      model,
      notes,
      loopMode,
      languages: { hi, ja },
      historyStrictness,
      runDate,
      pacingStyle,
      beatInterval,
      targetPlatform,
      hookStyle: hookStyle || undefined,
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-14 z-[150] overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-sm"
      data-testid="run-modal-backdrop"
      onClick={handleBackdropClick}
    >
      {/*
        Leave top-14 free so app topbar (z-200) stays clickable.
        Flex column panel: header + scroll body + sticky actions.
      */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
      <div
        className="
          bg-[#0a0a0b]/95 rounded-2xl w-full max-w-md
          border border-white/[0.1]
          max-h-[min(85vh,36rem)]
          flex flex-col overflow-hidden
          shadow-[0_0_60px_rgba(34,211,238,0.08)]
          my-auto
        "
        data-testid="run-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex justify-between items-center px-6 pt-6 pb-3">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Run Template
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
            type="button"
            aria-label="Close run modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto px-6 pb-2"
          data-testid="run-modal-body"
        >
          <div className="text-sm text-zinc-500 mb-4 space-y-1">
            <div>
              Template: <span className="text-white">{templateName}</span>
            </div>
            <div>
              Provider:{" "}
              <span
                className="text-cyan-300 capitalize"
                data-testid="llm-provider"
              >
                {provider}
              </span>
              {!hasKey && (
                <span className="text-red-400 ml-2">(no API key)</span>
              )}
            </div>
          </div>

          <form
            id="run-config-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="runDate"
                className="block text-sm font-medium text-zinc-300 mb-1"
              >
                Run Date
              </label>
              <input
                type="date"
                id="runDate"
                value={runDate}
                onChange={(e) => {
                  setRunDate(e.target.value);
                  clearValidation();
                }}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            <div>
              <label
                htmlFor="sceneCount"
                className="block text-sm font-medium text-zinc-300 mb-1"
              >
                Scene Count
              </label>
              <input
                type="number"
                id="sceneCount"
                value={sceneCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  applySceneCount(Number.isNaN(val) ? 0 : val);
                }}
                min={1}
                max={10}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Language weights auto-adjust to match scene count.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="loopMode"
                className="text-sm font-medium text-zinc-300"
              >
                Loop Mode
              </label>
              <input
                type="checkbox"
                id="loopMode"
                checked={loopMode}
                onChange={(e) => {
                  setLoopMode(e.target.checked);
                  clearValidation();
                }}
                className="h-4 w-4 rounded border-white/[0.12] bg-white/[0.04] text-green-500 focus:ring-cyan-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="langHi"
                  className="block text-sm font-medium text-zinc-300 mb-1"
                >
                  Hindi weight
                </label>
                <input
                  type="number"
                  id="langHi"
                  value={hiWeight}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setHiWeight(Number.isNaN(val) ? 0 : val);
                    clearValidation();
                  }}
                  min={0}
                  max={sceneCount || 10}
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
              <div>
                <label
                  htmlFor="langJa"
                  className="block text-sm font-medium text-zinc-300 mb-1"
                >
                  Japanese weight
                </label>
                <input
                  type="number"
                  id="langJa"
                  value={jaWeight}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setJaWeight(Number.isNaN(val) ? 0 : val);
                    clearValidation();
                  }}
                  min={0}
                  max={sceneCount || 10}
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500 -mt-2">
              Sum should equal scene count ({sceneCount}). Currently:{" "}
              {hiWeight + jaWeight}.
            </p>

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
                onChange={(e) => {
                  setHistoryStrictness(e.target.value as "hard-fail" | "warn");
                  clearValidation();
                }}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="warn">Warn on history collision</option>
                <option value="hard-fail">Hard-fail on history collision</option>
              </select>
            </div>

            {/* Preset-aware extended settings */}
            <div className="pt-3 border-t border-white/[0.06]">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
                Content Style
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="pacingStyle"
                    className="block text-sm font-medium text-zinc-300 mb-1"
                  >
                    Pacing
                  </label>
                  <select
                    id="pacingStyle"
                    value={pacingStyle}
                    onChange={(e) => {
                      setPacingStyle(e.target.value as PacingStyle);
                      clearValidation();
                    }}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="normal">Normal</option>
                    <option value="fast">Fast</option>
                    <option value="slow">Slow</option>
                    <option value="chaotic">Chaotic</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="targetPlatform"
                    className="block text-sm font-medium text-zinc-300 mb-1"
                  >
                    Platform
                  </label>
                  <select
                    id="targetPlatform"
                    value={targetPlatform}
                    onChange={(e) => {
                      setTargetPlatform(e.target.value as TargetPlatform);
                      clearValidation();
                    }}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="tiktok">TikTok</option>
                    <option value="reels">Instagram Reels</option>
                    <option value="shorts">YouTube Shorts</option>
                    <option value="generic">Generic</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label
                  htmlFor="beatInterval"
                  className="block text-sm font-medium text-zinc-300 mb-1"
                >
                  Beat Interval: {beatInterval.toFixed(1)}s
                </label>
                <input
                  type="range"
                  id="beatInterval"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={beatInterval}
                  onChange={(e) => {
                    setBeatInterval(parseFloat(e.target.value));
                    clearValidation();
                  }}
                  className="w-full h-2 bg-white/[0.04] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>0.5s (rapid)</span>
                  <span>5s (slow)</span>
                </div>
              </div>

              <div className="mt-3">
                <label
                  htmlFor="hookStyle"
                  className="block text-sm font-medium text-zinc-300 mb-1"
                >
                  Hook Style (optional)
                </label>
                <select
                  id="hookStyle"
                  value={hookStyle}
                  onChange={(e) => {
                    setHookStyle(e.target.value as HookStyle | "");
                    clearValidation();
                  }}
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="">Auto (based on preset)</option>
                  <option value="question">Question Hook</option>
                  <option value="shock">Shock Hook</option>
                  <option value="intrigue">Intrigue Hook</option>
                  <option value="direct">Direct Hook</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="model"
                className="block text-sm font-medium text-zinc-300 mb-1"
              >
                Model
              </label>
              <select
                id="model"
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  clearValidation();
                }}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                {models.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-zinc-300 mb-1"
              >
                Notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  clearValidation();
                }}
                rows={3}
                placeholder="Add any notes for this run..."
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
              />
            </div>

            <input type="hidden" name="templateId" value={templateId} readOnly />

            {(validationError || error) && (
              <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">
                {validationError || error}
              </div>
            )}
          </form>
        </div>

        <div
          className="shrink-0 flex gap-3 px-6 py-4 border-t border-white/[0.08] bg-[#0a0a0b]/95"
          data-testid="run-modal-actions"
        >
          <button
            type="button"
            onClick={onClose}
            className="pf-btn pf-btn-secondary flex-1 px-4 py-2.5"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="run-config-form"
            disabled={isLoading}
            aria-label="Generate"
            className={`
              pf-btn flex-1 px-4 py-2.5 font-semibold
              ${isLoading ? "opacity-60 cursor-not-allowed pf-btn-primary" : "pf-btn-primary"}
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
      </div>
      </div>
    </div>
  );
}
