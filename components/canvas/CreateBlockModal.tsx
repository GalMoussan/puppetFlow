"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { BlockType, Lane } from "@/packages/domain/types";

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: "HOOK", label: "Hook" },
  { value: "CAMERA_MOVE", label: "Camera Move" },
  { value: "PUPPET_DYNAMIC", label: "Puppet Dynamic" },
  { value: "PUPPET_VISUAL", label: "Puppet Visual" },
  { value: "PHYSICAL_GAG", label: "Physical Gag" },
  { value: "CHAOS_THREAD", label: "Chaos Thread" },
  { value: "PAYOFF", label: "Payoff" },
  { value: "STYLE_LOCK", label: "Style Lock" },
  { value: "STAGE_AREA", label: "Stage Area" },
  { value: "FESTIVAL_MOMENT", label: "Festival Moment" },
  { value: "CUSTOM", label: "Custom" },
  // Content preset block types
  { value: "GLITCH_EFFECT", label: "Glitch Effect" },
  { value: "SOUND_CUE", label: "Sound Cue" },
  { value: "TEXT_OVERLAY", label: "Text Overlay" },
  { value: "EXPLAINER_VISUAL", label: "Explainer Visual" },
  { value: "CHOREO_BEAT", label: "Choreo Beat" },
  { value: "STORY_BEAT", label: "Story Beat" },
  { value: "EMOTION_MARKER", label: "Emotion Marker" },
];

const STAGE_SCOPES: { value: Lane; label: string }[] = [
  { value: "GLOBAL", label: "Global" },
  { value: "IMAGE", label: "Image" },
  { value: "VIDEO_START", label: "Video Start" },
  { value: "EXTEND_MIDDLE", label: "Video Middle" },
  { value: "EXTEND_END", label: "Video End" },
];

// Default stage scopes by block type
const TYPE_DEFAULT_SCOPES: Record<BlockType, Lane[]> = {
  HOOK: ["GLOBAL", "IMAGE"],
  CAMERA_MOVE: ["IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  PUPPET_DYNAMIC: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  PUPPET_VISUAL: ["IMAGE"],
  PHYSICAL_GAG: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  CHAOS_THREAD: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  PAYOFF: ["EXTEND_END"],
  STYLE_LOCK: ["GLOBAL", "IMAGE"],
  STAGE_AREA: ["GLOBAL", "IMAGE"],
  FESTIVAL_MOMENT: ["IMAGE", "VIDEO_START", "EXTEND_MIDDLE"],
  THEME_PACK_REF: ["GLOBAL"],
  CHARACTER_LOCK: ["GLOBAL", "IMAGE"],
  SONG_SECTION: ["GLOBAL"],
  LANGUAGE: ["GLOBAL"],
  LOOP_CLOSURE: ["EXTEND_END"],
  CUSTOM: ["GLOBAL", "IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  // Content preset block types
  GLITCH_EFFECT: ["IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  SOUND_CUE: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  TEXT_OVERLAY: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  EXPLAINER_VISUAL: ["IMAGE", "VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  CHOREO_BEAT: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
  STORY_BEAT: ["GLOBAL"],
  EMOTION_MARKER: ["VIDEO_START", "EXTEND_MIDDLE", "EXTEND_END"],
};

interface BlockData {
  id: string;
  name: string;
  type: BlockType;
  promptFragment: string;
  stageScope: Lane[];
  rotationGroup?: string;
}

interface CreateBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (block: BlockData) => void;
  themePackId: string;
}

export function CreateBlockModal({
  isOpen,
  onClose,
  onCreated,
  themePackId,
}: CreateBlockModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<BlockType>("HOOK");
  const [promptFragment, setPromptFragment] = useState("");
  const [stageScope, setStageScope] = useState<Lane[]>(() => [
    ...(TYPE_DEFAULT_SCOPES.HOOK.length > 0
      ? TYPE_DEFAULT_SCOPES.HOOK
      : (["GLOBAL"] as Lane[])),
  ]);
  const [rotationGroup, setRotationGroup] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const clearFieldErrors = () => {
    setValidationErrors({});
    setError(null);
  };

  const handleTypeChange = (next: BlockType) => {
    setType(next);
    const defaults = TYPE_DEFAULT_SCOPES[next] || [];
    if (defaults.length > 0) {
      setStageScope([...defaults]);
    }
    clearFieldErrors();
  };

  const toggleScope = (scope: Lane) => {
    setStageScope((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
    clearFieldErrors();
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (name.length < 3) {
      errors.name = "At least 3 characters";
    } else if (name.length > 50) {
      errors.name = "Maximum 50 characters";
    }

    if (promptFragment.length < 10) {
      errors.promptFragment = "At least 10 characters";
    } else if (promptFragment.length > 500) {
      errors.promptFragment = "Maximum 500 characters";
    }

    if (stageScope.length === 0) {
      errors.stageScope = "At least one stage scope";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    if (!themePackId) {
      setError("No theme pack loaded — cannot save block permanently");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          promptFragment,
          stageScope,
          rotationGroup: rotationGroup || undefined,
          themePackId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          setError("Block name already exists");
        } else {
          setError(data.error || "Failed to create block");
        }
        return;
      }

      const payload = await response.json();
      // Support both bare block JSON and { data: block } envelopes
      const newBlock = (payload?.data ?? payload) as BlockData;
      onCreated(newBlock);
      onClose();
    } catch {
      setError("Network error - please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      data-testid="create-block-modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#0a0a0b] rounded-xl p-6 w-full max-w-lg border border-white/[0.1] max-h-[90vh] overflow-y-auto"
        data-testid="create-block-modal"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Create Block</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldErrors();
              }}
              placeholder="e.g., Dramatic Whip Pan"
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
            {validationErrors.name && (
              <p className="text-red-400 text-sm mt-1">{validationErrors.name}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-zinc-300 mb-1">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as BlockType)}
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              {BLOCK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Prompt Fragment */}
          <div>
            <label htmlFor="promptFragment" className="block text-sm font-medium text-zinc-300 mb-1">
              Prompt Fragment
            </label>
            <textarea
              id="promptFragment"
              value={promptFragment}
              onChange={(e) => {
                setPromptFragment(e.target.value);
                clearFieldErrors();
              }}
              rows={4}
              placeholder="Describe how this block should appear in the generated scene..."
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
            />
            {validationErrors.promptFragment && (
              <p className="text-red-400 text-sm mt-1">{validationErrors.promptFragment}</p>
            )}
          </div>

          {/* Stage Scope */}
          <div>
            <fieldset>
              <legend className="block text-sm font-medium text-zinc-300 mb-2">
                Stage Scope
              </legend>
              <div className="flex flex-wrap gap-2">
                {STAGE_SCOPES.map((scope) => (
                  <label
                    key={scope.value}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors
                      ${stageScope.includes(scope.value)
                        ? "bg-cyan-600 text-white"
                        : "bg-white/[0.04] text-zinc-500 hover:bg-white/[0.08]"}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={stageScope.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="sr-only"
                      aria-label={scope.label}
                    />
                    {scope.label}
                  </label>
                ))}
              </div>
              {validationErrors.stageScope && (
                <p className="text-red-400 text-sm mt-1">{validationErrors.stageScope}</p>
              )}
            </fieldset>
          </div>

          {/* Rotation Group */}
          <div>
            <label htmlFor="rotationGroup" className="block text-sm font-medium text-zinc-300 mb-1">
              Rotation Group (optional)
            </label>
            <input
              type="text"
              id="rotationGroup"
              value={rotationGroup}
              onChange={(e) => setRotationGroup(e.target.value)}
              placeholder="e.g., camera, gag, payoff"
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          {/* Block Preview */}
          <div
            data-testid="block-preview"
            data-type={type}
            className="p-4 bg-white/[0.04] rounded-lg border border-white/[0.1]"
          >
            <div className="text-sm text-zinc-500 mb-1">Preview</div>
            <div className="font-medium text-white">
              {name || "Block Name"}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {type} · {stageScope.join(", ") || "No scopes"}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={handleSubmit}
                className="text-red-300 hover:text-white underline text-sm"
              >
                Retry
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium
                ${isSubmitting
                  ? "bg-blue-700 cursor-not-allowed"
                  : "bg-cyan-600 hover:bg-cyan-500"}
                text-white transition-colors
              `}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
