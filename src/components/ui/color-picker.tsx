"use client";

import { useEffect, useRef, useState } from "react";
import { Pipette } from "lucide-react";
import { cn } from "@/lib/utils";

// The EyeDropper API (Chrome/Edge) lets the user sample a color from anywhere
// on screen, not just within the page — e.g. straight off the certificate image.
interface EyeDropperResult {
  sRGBHex: string;
}
interface EyeDropperInstance {
  open: () => Promise<EyeDropperResult>;
}
declare global {
  interface Window {
    EyeDropper?: new () => EyeDropperInstance;
  }
}

// A curated palette of colors that read well on printed/PDF certificates.
const PRESET_COLORS = [
  "#000000", "#1f2937", "#374151", "#4b5563", "#6b7280",
  "#111827", "#1e3a8a", "#1d4ed8", "#2563eb", "#0f766e",
  "#065f46", "#14532d", "#4d7c0f", "#78350f", "#92400e",
  "#b45309", "#d4af37", "#7f1d1d", "#991b1b", "#dc2626",
  "#800020", "#6d28d9", "#4338ca", "#334155", "#ffffff",
];

export function ColorPicker({
  value,
  onChange,
  className,
}: {
  value?: string;
  onChange: (hex: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value || "#000000");
  const [eyeDropperSupported, setEyeDropperSupported] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setEyeDropperSupported(typeof window !== "undefined" && !!window.EyeDropper), []);

  async function pickFromScreen() {
    if (!window.EyeDropper) return;
    try {
      const result = await new window.EyeDropper().open();
      onChange(result.sRGBHex);
      setHexInput(result.sRGBHex);
      setOpen(false);
    } catch {
      // user cancelled the pick — no-op
    }
  }

  useEffect(() => setHexInput(value || "#000000"), [value]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function commitHex(hex: string) {
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onChange(hex);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={value}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white shadow-sm hover:border-slate-400"
      >
        <span className="h-5 w-5 rounded-sm border border-slate-200" style={{ backgroundColor: value || "#000000" }} />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-56 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-3 grid grid-cols-5 gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={cn(
                  "h-7 w-7 rounded-md border transition-transform hover:scale-110",
                  value?.toLowerCase() === c ? "border-2 border-indigo-600" : "border-slate-200"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value || "#000000"}
              onChange={(e) => {
                onChange(e.target.value);
                setHexInput(e.target.value);
              }}
              className="h-8 w-8 shrink-0 cursor-pointer rounded border border-slate-300 p-0"
              title="Custom color"
            />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={() => commitHex(hexInput)}
              onKeyDown={(e) => e.key === "Enter" && commitHex(hexInput)}
              placeholder="#000000"
              className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono"
            />
          </div>
          {eyeDropperSupported && (
            <button
              type="button"
              onClick={pickFromScreen}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Pipette size={14} />
              Pick color from screen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
