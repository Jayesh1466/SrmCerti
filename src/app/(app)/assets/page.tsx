"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/upload-client";

interface Asset {
  id: string;
  type: string;
  name: string;
  filePath: string;
  createdAt: string;
}

const TYPES = ["logo", "seal", "signature", "watermark", "background"];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [uploadType, setUploadType] = useState("logo");
  const [uploadName, setUploadName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/assets");
    setAssets(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const data = await uploadFile(file, `assets/${uploadType}s`);
      await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: uploadType,
          name: uploadName || file.name.split(".")[0],
          filePath: data.url,
          width: data.width,
          height: data.height,
        }),
      });
      setUploadName("");
      load();
    } catch (err) {
      alert(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(asset: Asset) {
    setConfirmId(null);
    setDeletingId(asset.id);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    } catch {
      alert("Failed to delete asset");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = filter === "all" ? assets : assets.filter((a) => a.type === filter);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Asset Library</h1>
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="block text-xs font-medium">Type</label>
            <select className="rounded border border-slate-300 px-2 py-2 text-sm" value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium">Name</label>
            <Input className="w-48" value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="e.g. College Logo" />
          </div>
          <div>
            <label className="block text-xs font-medium">File</label>
            <input type="file" accept="image/png,image/jpeg" disabled={uploading} onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
        {TYPES.map((t) => (
          <Button key={t} variant={filter === t ? "default" : "outline"} size="sm" onClick={() => setFilter(t)}>
            {t}s
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {filtered.map((a) => (
          <Card key={a.id} className="group relative">
            {confirmId === a.id ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/95 p-2 text-center">
                <p className="text-xs font-medium text-slate-700">Delete this asset?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(a)}
                    disabled={deletingId === a.id}
                    className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingId === a.id ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmId(a.id)}
                title="Delete asset"
                className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-red-600 opacity-70 shadow transition-opacity hover:bg-red-50 group-hover:opacity-100"
              >
                ✕
              </button>
            )}
            <div className="flex aspect-square items-center justify-center bg-slate-50 p-2">
              <img src={a.filePath} alt={a.name} className="max-h-full max-w-full object-contain" />
            </div>
            <CardContent className="p-2">
              <p className="truncate text-xs font-medium">{a.name}</p>
              <p className="text-[10px] text-slate-400">{a.type}</p>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="col-span-5 text-sm text-slate-500">No assets yet.</p>}
      </div>
    </div>
  );
}
