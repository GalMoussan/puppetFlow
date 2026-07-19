/**
 * Theme Pack Editor Component
 *
 * Main editor with tabs for Canon Pools, Characters, and Universe Rules.
 *
 * @module components/theme-pack/ThemePackEditor
 */

"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, Save, AlertCircle, Check, Layers, Users, BookOpen } from "lucide-react";
import Link from "next/link";
import { CanonPoolEditor } from "./CanonPoolEditor";
import { CharacterEditor } from "./CharacterEditor";
import { UniverseRulesEditor } from "./UniverseRulesEditor";
import { CanonPreview } from "./CanonPreview";
import { FullCanonSchema, type FullCanon, type Character } from "@/packages/domain/types";

type Tab = "pools" | "characters" | "rules";

interface ThemePackEditorProps {
  themePackId: string;
  themePackName: string;
  initialCanon: Record<string, unknown>;
}

export function ThemePackEditor({ themePackId, themePackName, initialCanon }: ThemePackEditorProps) {
  // Parse initial canon with defaults
  const parsedCanon = FullCanonSchema.safeParse(initialCanon);
  const defaultCanon: FullCanon = parsedCanon.success
    ? parsedCanon.data
    : FullCanonSchema.parse({});

  const [canon, setCanon] = useState<FullCanon>(defaultCanon);
  const [activeTab, setActiveTab] = useState<Tab>("pools");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Update a pool
  const updatePool = useCallback((key: string, values: string[]) => {
    setCanon((prev) => ({
      ...prev,
      [key]: values,
    }));
    setSaveStatus("idle");
  }, []);

  // Update camera moves
  const updateCameraMoves = useCallback((stage: "start" | "middle" | "end", values: string[]) => {
    setCanon((prev) => ({
      ...prev,
      cameraMoves: {
        ...prev.cameraMoves,
        [stage]: values,
      },
    }));
    setSaveStatus("idle");
  }, []);

  // Update characters
  const updateCharacters = useCallback((characters: Character[]) => {
    setCanon((prev) => ({
      ...prev,
      characters,
    }));
    setSaveStatus("idle");
  }, []);

  // Update universe rules
  const updateUniverseRules = useCallback((rules: string) => {
    setCanon((prev) => ({
      ...prev,
      universeRules: rules,
    }));
    setSaveStatus("idle");
  }, []);

  // Save to API
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/theme-packs/${themePackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canon }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Edit Theme Pack</h1>
            <p className="text-sm text-zinc-500">{themePackName}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              saveStatus === "success"
                ? "bg-green-600 text-white"
                : "bg-violet-600 hover:bg-violet-500 text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saveStatus === "success" ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? "Saving..." : saveStatus === "success" ? "Saved" : "Save"}</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-zinc-800 bg-zinc-900/30">
        <TabButton
          active={activeTab === "pools"}
          onClick={() => setActiveTab("pools")}
          icon={<Layers className="w-4 h-4" />}
          label="Canon Pools"
        />
        <TabButton
          active={activeTab === "characters"}
          onClick={() => setActiveTab("characters")}
          icon={<Users className="w-4 h-4" />}
          label="Characters"
        />
        <TabButton
          active={activeTab === "rules"}
          onClick={() => setActiveTab("rules")}
          icon={<BookOpen className="w-4 h-4" />}
          label="Universe Rules"
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Editor */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "pools" && (
            <CanonPoolEditor
              canon={canon}
              onUpdatePool={updatePool}
              onUpdateCameraMoves={updateCameraMoves}
            />
          )}
          {activeTab === "characters" && (
            <CharacterEditor
              characters={canon.characters}
              onUpdate={updateCharacters}
            />
          )}
          {activeTab === "rules" && (
            <UniverseRulesEditor
              rules={canon.universeRules}
              onUpdate={updateUniverseRules}
            />
          )}
        </div>

        {/* Preview Panel */}
        <div className="w-80 border-l border-zinc-800 bg-zinc-900/30 overflow-auto">
          <CanonPreview canon={canon} />
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-violet-600/20 text-violet-400"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
