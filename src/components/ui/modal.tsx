"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, maxWidth = "max-w-sm", children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" data-testid="modal-overlay" onClick={onClose} />
      <div
        className={`relative w-full ${maxWidth} rounded-xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto`}
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose}>
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
