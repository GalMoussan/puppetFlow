/**
 * Template Hook
 *
 * Hook for loading and saving templates with debounced autosave.
 *
 * @module lib/hooks/useTemplate
 */

import { useEffect, useMemo, useCallback, useRef } from "react";
import { useCanvasStore } from "@/lib/store/canvas-store";

/**
 * Debounce function that returns a debounced version of the callback
 */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Hook for template load/save operations
 *
 * @param templateId - Template ID to load, or null for new template
 * @returns Object with save function and loading state
 */
export function useTemplate(templateId: string | null) {
  const loadTemplate = useCanvasStore((s) => s.loadTemplate);
  const saveTemplate = useCanvasStore((s) => s.saveTemplate);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const saveState = useCanvasStore((s) => s.saveState);

  const isInitialMount = useRef(true);

  // Load template on mount or ID change
  useEffect(() => {
    if (!templateId) return;

    loadTemplate(templateId).catch((error) => {
      console.error("Failed to load template:", error);
    });
  }, [templateId, loadTemplate]);

  // Create debounced save (500ms delay)
  const debouncedSave = useMemo(
    () => debounce(saveTemplate, 500),
    [saveTemplate]
  );

  // Autosave when dirty
  useEffect(() => {
    // Skip autosave on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isDirty && templateId) {
      debouncedSave();
    }

    return () => {
      debouncedSave.cancel();
    };
  }, [isDirty, templateId, debouncedSave]);

  // Manual save function
  const save = useCallback(async () => {
    debouncedSave.cancel();
    await saveTemplate();
  }, [saveTemplate, debouncedSave]);

  return {
    save,
    saveState,
    isDirty,
  };
}
