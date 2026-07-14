"use client";

import { useState, useEffect } from "react";
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
  const [stageScope, setStageScope] = useState<Lane[]>(["GLOBAL"]);
  const [rotationGroup, setRotationGroup] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Update default stage scopes when type changes
  useEffect(() => {
    const defaults = TYPE_DEFAULT_SCOPES[type] || [];
    if (defaults.length > 0) {
      setStageScope(defaults);
    }
  }, [type]);

  // Clear errors when inputs change
  useEffect(() => {
    setValidationErrors({});
    setError(null);
  }, [name, type, promptFragment, stageScope]);

  if (!isOpen) return null;

  const toggleScope = (scope: Lane) => {
    setStageScope((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
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
    } catch (err) {
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
        className="bg-zinc-900 rounded-xl p-6 w-full max-w-lg border border-zinc-700 max-h-[90vh] overflow-y-auto"
        data-testid="create-block-modal"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Create Block</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
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
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Dramatic Whip Pan"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              onChange={(e) => setType(e.target.value as BlockType)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              onChange={(e) => setPromptFragment(e.target.value)}
              rows={4}
              placeholder="Describe how this block should appear in the generated scene..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}
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
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Block Preview */}
          <div
            data-testid="block-preview"
            data-type={type}
            className="p-4 bg-zinc-800 rounded-lg border border-zinc-700"
          >
            <div className="text-sm text-zinc-400 mb-1">Preview</div>
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
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
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
                  : "bg-blue-600 hover:bg-blue-500"}
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
