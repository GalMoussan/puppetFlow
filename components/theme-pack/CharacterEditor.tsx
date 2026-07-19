/**
 * Character Editor Component
 *
 * Card-based editor for character definitions with inline editing.
 *
 * @module components/theme-pack/CharacterEditor
 */

"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { type Character } from "@/packages/domain/types";

interface CharacterEditorProps {
  characters: Character[];
  onUpdate: (characters: Character[]) => void;
}

export function CharacterEditor({ characters, onUpdate }: CharacterEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addCharacter = () => {
    const newCharacter: Character = {
      name: "New Character",
      description: "",
      lockText: "",
    };
    onUpdate([...characters, newCharacter]);
    setEditingIndex(characters.length);
  };

  const updateCharacter = (index: number, updates: Partial<Character>) => {
    onUpdate(
      characters.map((char, i) =>
        i === index ? { ...char, ...updates } : char
      )
    );
  };

  const deleteCharacter = (index: number) => {
    onUpdate(characters.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Characters</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Define characters with their R13 lock text for verbatim preservation.
          </p>
        </div>
        <button
          onClick={addCharacter}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Character</span>
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-zinc-800 rounded-lg">
          <p className="text-zinc-500 mb-4">No characters defined yet</p>
          <button
            onClick={addCharacter}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add your first character</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {characters.map((character, index) => (
            <CharacterCard
              key={index}
              character={character}
              isEditing={editingIndex === index}
              onEdit={() => setEditingIndex(index)}
              onSave={() => setEditingIndex(null)}
              onCancel={() => setEditingIndex(null)}
              onUpdate={(updates) => updateCharacter(index, updates)}
              onDelete={() => deleteCharacter(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CharacterCard({
  character,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onUpdate,
  onDelete,
}: {
  character: Character;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onUpdate: (updates: Partial<Character>) => void;
  onDelete: () => void;
}) {
  const [localName, setLocalName] = useState(character.name);
  const [localDescription, setLocalDescription] = useState(character.description);
  const [localLockText, setLocalLockText] = useState(character.lockText);

  const handleSave = () => {
    onUpdate({
      name: localName.trim() || "Unnamed",
      description: localDescription,
      lockText: localLockText,
    });
    onSave();
  };

  const handleCancel = () => {
    setLocalName(character.name);
    setLocalDescription(character.description);
    setLocalLockText(character.lockText);
    onCancel();
  };

  if (isEditing) {
    return (
      <div className="bg-zinc-900 rounded-lg border border-violet-500/50 p-5">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Name
            </label>
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-violet-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Description
            </label>
            <textarea
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              rows={2}
              placeholder="Character description for AI context..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Lock Text (R13)
            </label>
            <textarea
              value={localLockText}
              onChange={(e) => setLocalLockText(e.target.value)}
              rows={3}
              placeholder="Exact verbatim text for character lock..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 font-mono text-sm resize-none focus:outline-none focus:border-violet-500"
            />
            <p className="text-xs text-zinc-500 mt-1">
              This text will be preserved verbatim in generated prompts.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-5 group">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-zinc-200">{character.name}</h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {character.description && (
        <p className="text-sm text-zinc-400 mb-3">{character.description}</p>
      )}

      {character.lockText && (
        <div className="mt-3 p-3 bg-zinc-800/50 rounded border border-zinc-700">
          <span className="text-xs text-zinc-500 block mb-1">Lock Text</span>
          <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">
            {character.lockText}
          </pre>
        </div>
      )}

      {!character.description && !character.lockText && (
        <p className="text-sm text-zinc-500 italic">No details yet. Click edit to add.</p>
      )}
    </div>
  );
}
