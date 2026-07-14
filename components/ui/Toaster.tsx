/**
 * Global toast host — mount once in root layout.
 *
 * Dark UI with violet/green festival accents.
 *
 * @module components/ui/Toaster
 */

"use client";

import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useToastStore, type ToastType } from "@/lib/store/toast-store";

const TYPE_STYLES: Record<
  ToastType,
  { border: string; icon: typeof CheckCircle2; iconClass: string; testId: string }
> = {
  success: {
    border: "border-green-500/40",
    icon: CheckCircle2,
    iconClass: "text-green-400",
    testId: "toast-success",
  },
  error: {
    border: "border-red-500/40",
    icon: XCircle,
    iconClass: "text-red-400",
    testId: "toast-error",
  },
  info: {
    border: "border-violet-500/40",
    icon: Info,
    iconClass: "text-violet-400",
    testId: "toast-info",
  },
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      data-testid="toaster"
      className="
        fixed bottom-4 right-4 z-[100]
        flex flex-col gap-2
        w-full max-w-sm pointer-events-none
      "
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => {
        const style = TYPE_STYLES[t.type];
        const Icon = style.icon;
        return (
          <div
            key={t.id}
            role="status"
            data-testid={style.testId}
            data-toast-id={t.id}
            className={`
              pointer-events-auto
              flex items-start gap-3
              px-4 py-3 rounded-lg
              bg-zinc-900/95 backdrop-blur
              border ${style.border}
              shadow-lg shadow-black/40
              text-sm text-zinc-100
              animate-in fade-in slide-in-from-bottom-2
            `}
          >
            <Icon
              className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconClass}`}
              aria-hidden
            />
            <p className="flex-1 min-w-0 leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="
                shrink-0 p-0.5 rounded
                text-zinc-500 hover:text-zinc-200
                transition-colors
              "
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
