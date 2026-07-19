/**
 * Bulk Action Bar Component
 *
 * Action bar for bulk operations on selected blocks.
 *
 * @module components/canvas/BulkActionBar
 */

"use client";

import { Archive, ArchiveRestore, Trash2, CheckSquare, XSquare } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  showArchived: boolean;
  loading: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  showArchived,
  loading,
  onSelectAll,
  onClearSelection,
  onArchive,
  onRestore,
  onDelete,
}: BulkActionBarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-violet-600/10 border-b border-violet-500/30">
      <div className="flex items-center gap-4">
        <span className="text-sm text-violet-300">
          {selectedCount} of {totalCount} selected
        </span>

        <div className="flex items-center gap-1">
          {selectedCount < totalCount && (
            <button
              onClick={onSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-violet-400 hover:text-violet-300 hover:bg-violet-600/20 rounded transition-colors"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Select all</span>
            </button>
          )}
          <button
            onClick={onClearSelection}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-violet-400 hover:text-violet-300 hover:bg-violet-600/20 rounded transition-colors"
          >
            <XSquare className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showArchived ? (
          <>
            <ActionButton
              onClick={onRestore}
              disabled={loading}
              icon={<ArchiveRestore className="w-4 h-4" />}
              label="Restore"
              variant="primary"
            />
            <ActionButton
              onClick={onDelete}
              disabled={loading}
              icon={<Trash2 className="w-4 h-4" />}
              label="Delete"
              variant="danger"
            />
          </>
        ) : (
          <ActionButton
            onClick={onArchive}
            disabled={loading}
            icon={<Archive className="w-4 h-4" />}
            label="Archive"
            variant="primary"
          />
        )}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  icon,
  label,
  variant,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  variant: "primary" | "danger";
}) {
  const variantStyles = {
    primary:
      "bg-violet-600 hover:bg-violet-500 text-white disabled:bg-violet-600/50",
    danger: "bg-red-600 hover:bg-red-500 text-white disabled:bg-red-600/50",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed ${variantStyles[variant]}`}
    >
      {disabled ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        icon
      )}
      <span>{label}</span>
    </button>
  );
}
