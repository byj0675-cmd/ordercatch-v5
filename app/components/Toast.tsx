"use client";

import { useEffect, useState, useCallback } from "react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  icon?: string;
}

let toastCallbacks: ((toast: Toast) => void)[] = [];

export function showToast(message: string, type: Toast["type"] = "success", icon?: string) {
  const toast: Toast = {
    id: Math.random().toString(36).slice(2),
    message,
    type,
    icon,
  };
  toastCallbacks.forEach((cb) => cb(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exiting, setExiting] = useState<Set<string>>(new Set());

  const removeToast = useCallback((id: string) => {
    setExiting((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setExiting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }, []);

  useEffect(() => {
    const handler = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => removeToast(toast.id), 3500);
    };
    toastCallbacks.push(handler);
    return () => {
      toastCallbacks = toastCallbacks.filter((cb) => cb !== handler);
    };
  }, [removeToast]);

  const typeStyles: Record<Toast["type"], { bg: string; border: string; icon: string }> = {
    success: { bg: "#1c1c1e", border: "rgba(52,199,89,0.4)", icon: "✓" },
    error: { bg: "#1c1c1e", border: "rgba(255,59,48,0.4)", icon: "✕" },
    info: { bg: "#1c1c1e", border: "rgba(0,122,255,0.4)", icon: "ℹ" },
    warning: { bg: "#1c1c1e", border: "rgba(255,149,0,0.4)", icon: "!" },
  };

  const dotColors: Record<Toast["type"], string> = {
    success: "#34c759",
    error: "#ff3b30",
    info: "#007aff",
    warning: "#ff9500",
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={exiting.has(toast.id) ? "animate-toastOut" : "animate-toastIn"}
          onClick={() => removeToast(toast.id)}
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 18px",
            background: typeStyles[toast.type].bg,
            border: `1px solid ${typeStyles[toast.type].border}`,
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            cursor: "pointer",
            minWidth: 220,
            maxWidth: 360,
            backdropFilter: "blur(20px)",
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: dotColors[toast.type],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {toast.icon || typeStyles[toast.type].icon}
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#fff", lineHeight: 1.4 }}>
            {toast.message}
          </span>
        </div>
      ))}
    </div>
  );
}
