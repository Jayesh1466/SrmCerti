"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Two-step delete: first click asks for confirmation, second click deletes.
// `redirectTo` navigates away afterwards (used on the template's own page); otherwise the list refreshes.
export function DeleteTemplateButton({
  templateId,
  templateName,
  redirectTo,
  className,
}: {
  templateId: string;
  templateName: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/templates/${templateId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch {
      alert(`Failed to delete "${templateName}"`);
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2 text-xs", className)}>
        <span className="text-slate-600">Delete this template and its generated certificates?</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="rounded border border-slate-300 px-2 py-1 font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      title={`Delete "${templateName}"`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50",
        className
      )}
    >
      <Trash2 size={14} />
      Delete
    </button>
  );
}
