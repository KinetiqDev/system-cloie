"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "warning" | "information";

type ToastMessage = {
  id: number;
  kind: ToastKind;
  message: string;
};

const TOAST_EVENT = "cloie-toast";

export function showToast(message: string, kind: ToastKind = "success") {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: { kind, message },
    })
  );
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    function pushToast(message: string, kind: ToastKind) {
      const id = Date.now();
      setToasts((current) => [...current, { id, kind, message }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 4500);
    }

    function handleToast(event: Event) {
      const detail = (event as CustomEvent<{ kind?: ToastKind; message?: string }>).detail;
      if (!detail?.message) {
        return;
      }
      pushToast(detail.message, detail.kind ?? "success");
    }

    window.addEventListener(TOAST_EVENT, handleToast);

    return () => window.removeEventListener(TOAST_EVENT, handleToast);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const toast = params.get("toast");

    if (!toast) {
      return;
    }

    const kind =
      params.get("toastType") === "error"
        ? "error"
        : params.get("toastType") === "warning"
        ? "warning"
        : params.get("toastType") === "info"
        ? "information"
        : "success";
    window.dispatchEvent(
      new CustomEvent(TOAST_EVENT, {
        detail: { kind, message: toast },
      })
    );

    params.delete("toast");
    params.delete("toastType");
    const nextQuery = params.toString();
    const nextUrl = `${pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, [pathname, searchParams]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-[100] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon =
          toast.kind === "success"
            ? CheckCircle2
            : toast.kind === "warning"
            ? AlertTriangle
            : toast.kind === "information"
            ? Info
            : XCircle;
        return (
          <div
            key={toast.id}
            className={cn(
              "bg-surface flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg",
              toast.kind === "success"
                ? "border-success/40 text-success"
                : toast.kind === "warning"
                ? "border-warning/40 text-warning"
                : toast.kind === "information"
                ? "border-info/40 text-info"
                : "border-danger/40 text-danger"
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <p className="font-medium">{toast.message}</p>
          </div>
        );
      })}
    </div>
  );
}
