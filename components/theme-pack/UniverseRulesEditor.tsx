/**
 * Universe Rules Editor Component
 *
 * Markdown text area for universe rules and guidelines.
 *
 * @module components/theme-pack/UniverseRulesEditor
 */

"use client";

import { useState } from "react";
import { Eye, Edit2 } from "lucide-react";

interface UniverseRulesEditorProps {
  rules: string;
  onUpdate: (rules: string) => void;
}

export function UniverseRulesEditor({ rules, onUpdate }: UniverseRulesEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Universe Rules</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Define the rules and guidelines for your universe. This will be included in the AI context.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setMode("edit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
              mode === "edit"
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => setMode("preview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
              mode === "preview"
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
        {mode === "edit" ? (
          <textarea
            value={rules}
            onChange={(e) => onUpdate(e.target.value)}
            placeholder={PLACEHOLDER_RULES}
            rows={24}
            className="w-full p-4 bg-transparent text-zinc-200 placeholder-zinc-600 font-mono text-sm resize-none focus:outline-none"
          />
        ) : (
          <div className="p-4 prose prose-invert prose-sm max-w-none">
            {rules ? (
              <MarkdownPreview content={rules} />
            ) : (
              <p className="text-zinc-500 italic">No rules defined yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-500">
        Supports Markdown formatting: **bold**, *italic*, # headings, - lists, etc.
      </div>
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  // Simple markdown rendering (headings, bold, italic, lists)
  const lines = content.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        // Heading
        if (line.startsWith("# ")) {
          return (
            <h1 key={index} className="text-xl font-bold text-zinc-100 mt-4 mb-2">
              {formatInline(line.slice(2))}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2 key={index} className="text-lg font-semibold text-zinc-200 mt-3 mb-2">
              {formatInline(line.slice(3))}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={index} className="text-base font-medium text-zinc-300 mt-2 mb-1">
              {formatInline(line.slice(4))}
            </h3>
          );
        }

        // List item
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <li key={index} className="text-zinc-300 ml-4 list-disc">
              {formatInline(line.slice(2))}
            </li>
          );
        }

        // Empty line
        if (line.trim() === "") {
          return <div key={index} className="h-2" />;
        }

        // Regular paragraph
        return (
          <p key={index} className="text-zinc-300">
            {formatInline(line)}
          </p>
        );
      })}
    </div>
  );
}

function formatInline(text: string): React.ReactNode {
  // Split by bold (**text**) and italic (*text*)
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Check for italic (not bold)
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);

    if (boldMatch && (!italicMatch || boldMatch.index! <= italicMatch.index!)) {
      // Add text before bold
      if (boldMatch.index! > 0) {
        parts.push(remaining.slice(0, boldMatch.index));
      }
      // Add bold text
      parts.push(
        <strong key={key++} className="font-bold text-zinc-100">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch.index! + boldMatch[0].length);
    } else if (italicMatch) {
      // Add text before italic
      if (italicMatch.index! > 0) {
        parts.push(remaining.slice(0, italicMatch.index));
      }
      // Add italic text
      parts.push(
        <em key={key++} className="italic">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice(italicMatch.index! + italicMatch[0].length);
    } else {
      // No more formatting
      parts.push(remaining);
      break;
    }
  }

  return parts;
}

const PLACEHOLDER_RULES = `# Universe Rules

Define the core rules and guidelines for your universe here.

## Visual Style
- Describe the overall visual aesthetic
- List any recurring visual motifs

## Character Behavior
- How do characters interact?
- What are the constraints on their actions?

## World Rules
- Physical laws of your universe
- Social structures and hierarchies

## Tone Guidelines
- Comedy style and limits
- Drama and tension guidelines`;
