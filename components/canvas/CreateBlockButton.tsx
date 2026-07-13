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

export function CreateBlockButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const themePackId = useCanvasStore(
    useShallow((state) => state.themePackId)
  );

  const handleCreated = (block: BlockData) => {
    // The block library will be refreshed by the modal
    // For now, just close the modal
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        aria-label="Create block"
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
