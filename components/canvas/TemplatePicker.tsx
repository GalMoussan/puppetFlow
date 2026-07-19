/**
 * Template Picker
 *
 * Dropdown to list and switch between saved templates.
 *
 * @module components/canvas/TemplatePicker
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, FileText, Loader2 } from "lucide-react";

interface TemplateItem {
  id: string;
  name: string;
  updatedAt: string;
}

interface TemplatePickerProps {
  currentTemplateId: string | null;
  currentTemplateName: string | null;
  onSelect: (templateId: string) => void;
}

export function TemplatePicker({
  currentTemplateId,
  currentTemplateName,
  onSelect,
}: TemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch templates when dropdown opens
  useEffect(() => {
    if (!isOpen) return;

    async function fetchTemplates() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/templates?limit=50");
        if (!res.ok) throw new Error("Failed to load templates");
        const json = await res.json();
        setTemplates(json.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    void fetchTemplates();
  }, [isOpen]);

  const handleSelect = (templateId: string) => {
    if (templateId !== currentTemplateId) {
      onSelect(templateId);
    }
    setIsOpen(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/[0.05] transition-colors group"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-testid="template-picker-trigger"
      >
        <span className="text-sm text-zinc-400 group-hover:text-zinc-300 truncate max-w-[200px]">
          {currentTemplateName || "No template"}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-72 bg-[#0a0a0b] border border-white/[0.08] rounded-lg shadow-xl z-50 overflow-hidden"
          role="listbox"
          data-testid="template-picker-dropdown"
        >
          <div className="px-3 py-2 border-b border-white/[0.06]">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
              Saved Templates
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : error ? (
              <div className="px-3 py-4 text-sm text-red-400 text-center">
                {error}
              </div>
            ) : templates.length === 0 ? (
              <div className="px-3 py-4 text-sm text-zinc-500 text-center">
                No templates yet
              </div>
            ) : (
              <ul className="py-1">
                {templates.map((template) => {
                  const isActive = template.id === currentTemplateId;
                  return (
                    <li key={template.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(template.id)}
                        className={`
                          w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors
                          ${isActive
                            ? "bg-cyan-500/10 text-white"
                            : "hover:bg-white/[0.04] text-zinc-300"
                          }
                        `}
                        role="option"
                        aria-selected={isActive}
                      >
                        <FileText className={`w-4 h-4 shrink-0 ${isActive ? "text-cyan-400" : "text-zinc-500"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{template.name}</p>
                          <p className="text-xs text-zinc-500">
                            Updated {formatDate(template.updatedAt)}
                          </p>
                        </div>
                        {isActive && (
                          <span className="text-xs text-cyan-400 font-medium shrink-0">
                            Current
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
