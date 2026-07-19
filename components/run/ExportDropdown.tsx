/**
 * Export Dropdown Component
 *
 * Dropdown menu for exporting run results in various formats.
 *
 * @module components/run/ExportDropdown
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileText, File, ChevronDown } from "lucide-react";

interface ExportDropdownProps {
  runId: string;
  hasScenes: boolean;
  hasScaffold: boolean;
}

type ExportFormat = "scenes" | "scaffold" | "pdf" | "docx";

interface ExportOption {
  format: ExportFormat;
  label: string;
  description: string;
  icon: typeof FileText;
  requiresScenes?: boolean;
  requiresScaffold?: boolean;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: "scenes",
    label: "Scenes (Markdown)",
    description: "All prompts in Markdown format",
    icon: FileText,
    requiresScenes: true,
  },
  {
    format: "scaffold",
    label: "Scaffold (Markdown)",
    description: "Raw scaffold output",
    icon: FileText,
    requiresScaffold: true,
  },
  {
    format: "pdf",
    label: "PDF Document",
    description: "Formatted PDF report",
    icon: File,
    requiresScenes: true,
  },
  {
    format: "docx",
    label: "Word Document",
    description: "Editable DOCX format",
    icon: File,
    requiresScenes: true,
  },
];

export function ExportDropdown({ runId, hasScenes, hasScaffold }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setIsOpen(false);

    try {
      const response = await fetch(`/api/export/${runId}?format=${format}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      // Get filename from Content-Disposition header
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] || `export-${runId}.${format === "docx" ? "docx" : format === "pdf" ? "pdf" : "md"}`;

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const availableOptions = EXPORT_OPTIONS.filter((option) => {
    if (option.requiresScenes && !hasScenes) return false;
    if (option.requiresScaffold && !hasScaffold) return false;
    return true;
  });

  if (availableOptions.length === 0) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 rounded-lg border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        <span>{isExporting ? "Exporting..." : "Export"}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-zinc-800 rounded-lg border border-zinc-700 shadow-xl z-50">
          <div className="p-2">
            {availableOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.format}
                  onClick={() => handleExport(option.format)}
                  className="w-full flex items-start gap-3 p-2 rounded-md hover:bg-zinc-700 transition-colors text-left"
                >
                  <Icon className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{option.label}</div>
                    <div className="text-xs text-zinc-500">{option.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
