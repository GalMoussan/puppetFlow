/**
 * Global toast host — mount once in root layout.
 * Tech-black glass cards with cyan/emerald/red accents.
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
    border: "border-emerald-500/30",
    icon: CheckCircle2,
    iconClass: "text-emerald-400",
    testId: "toast-success",
  },
  error: {
    border: "border-red-500/30",
    icon: XCircle,
    iconClass: "text-red-400",
    testId: "toast-error",
  },
  info: {
    border: "border-cyan-500/30",
    icon: Info,
    iconClass: "text-cyan-400",
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
        fixed bottom-5 right-5 z-[100]
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
              px-4 py-3 rounded-xl
              bg-black/85 backdrop-blur-xl
              border ${style.border}
              shadow-[0_8px_32px_rgba(0,0,0,0.6)]
              text-sm text-zinc-100 tracking-tight
            `}
          >
            <Icon
              className={`w-4.5 h-4.5 shrink-0 mt-0.5 ${style.iconClass}`}
              aria-hidden
            />
            <p className="flex-1 min-w-0 leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="
                shrink-0 p-0.5 rounded-md
                text-zinc-600 hover:text-zinc-200
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
