"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useCanvasStore } from "@/lib/store/canvas-store";
import { useShallow } from "zustand/shallow";
import { CreateBlockModal } from "./CreateBlockModal";
import type { BlockType, Lane } from "@/packages/domain/types";

interface BlockData {
  id: string;
  name: string;
  type: BlockType;
  promptFragment: string;
  stageScope: Lane[];
  rotationGroup?: string;
}

interface CreateBlockButtonProps {
  /** Called after a block is persisted so the palette can refetch */
  onCreated?: (block: BlockData) => void;
}

export function CreateBlockButton({ onCreated }: CreateBlockButtonProps = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const themePackId = useCanvasStore(
    useShallow((state) => state.themePackId)
  );

  const handleCreated = (block: BlockData) => {
    setIsModalOpen(false);
    onCreated?.(block);
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={!themePackId}
        className={`
          w-full flex items-center justify-center gap-2 px-3 py-2
          text-sm font-medium rounded-lg transition-colors border
          ${
            themePackId
              ? "text-violet-200 bg-violet-950/50 border-violet-700/50 hover:bg-violet-900/40 hover:text-white"
              : "text-zinc-500 bg-zinc-800/50 border-zinc-700 cursor-not-allowed"
          }
        `}
        aria-label="Create block"
        type="button"
        title={themePackId ? "Create a new block" : "Theme pack required"}
      >
        <Plus className="w-4 h-4" />
        Create Block
      </button>

      <CreateBlockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
        themePackId={themePackId || ""}
      />
    </>
  );
}
