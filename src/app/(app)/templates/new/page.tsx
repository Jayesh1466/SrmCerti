"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/ui/color-picker";
import { Card, CardContent } from "@/components/ui/card";
import { CanvasEditor, EditableItem } from "@/components/wizard/canvas-editor";
import { FONT_OPTIONS, getFontOption } from "@/lib/fonts";
import type {
  ImageOverlay,
  SignatureOverlay,
  TextFieldConfig,
  TextBlock,
  WatermarkConfig,
  QrConfig,
  Position,
} from "@/lib/types";

const STEPS = [
  "Template",
  "Logos",
  "Seals",
  "Signatures",
  "Student Name",
  "Reg Number",
  "Content",
  "Watermark/QR",
  "Review",
];

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_POS: Position = { x: 0.35, y: 0.4, width: 0.3, height: 0.1 };

const SAMPLE_DATA: Record<string, string> = {
  student_name: "Jayesh D",
  registration_number: "RA2311001",
  certificate_id: "CERT-SAMPLE-0001",
  event_name: "Sample Event Name",
  date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
  organization: "SRM Institute of Science and Technology",
  department: "Department of Computer Science",
  college: "SRM Institute of Science and Technology",
  course: "B.Tech",
  year: String(new Date().getFullYear()),
  verification_url: "https://example.com/verify/CERT-SAMPLE-0001",
};

// Substitute {{placeholders}} with sample values so the live preview shows what the certificate will actually look like.
function renderPreviewText(content: string): string {
  return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => SAMPLE_DATA[key] ?? match);
}

function applyCaseTransform(text: string, transform?: TextFieldConfig["caseTransform"]): string {
  if (transform === "upper") return text.toUpperCase();
  if (transform === "lower") return text.toLowerCase();
  if (transform === "title") return text.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  return text;
}

// Auto-arrange logos evenly across the top of the certificate, in the order they appear in the array.
function arrangeLogosTopRow(items: ImageOverlay[]): ImageOverlay[] {
  const n = items.length;
  if (n === 0) return items;
  const y = 0.03;
  const height = 0.12;
  const width = Math.min(0.22, 0.9 / n);
  const totalWidth = width * n;
  const gap = n > 1 ? (0.9 - totalWidth) / (n - 1) : 0;
  const startX = 0.05;
  return items.map((item, i) => ({
    ...item,
    position: { x: startX + i * (width + gap), y, width, height },
  }));
}

export default function NewTemplatePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [bg, setBg] = useState<{ url: string; width: number; height: number; orientation: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logos, setLogos] = useState<ImageOverlay[]>([]);
  const [seals, setSeals] = useState<ImageOverlay[]>([]);
  const [signatures, setSignatures] = useState<SignatureOverlay[]>([]);
  const [studentNameField, setStudentNameField] = useState<TextFieldConfig>({
    enabled: false,
    position: { x: 0.3, y: 0.45, width: 0.4, height: 0.08 },
    fontFamily: "Helvetica",
    fontSize: 28,
    color: "#111111",
    caseTransform: "none",
  });
  const [regNumberField, setRegNumberField] = useState<TextFieldConfig>({
    enabled: false,
    position: { x: 0.4, y: 0.58, width: 0.2, height: 0.05 },
    fontFamily: "Helvetica",
    fontSize: 12,
    color: "#333333",
    format: "({{registration_number}})",
  });
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [watermark, setWatermark] = useState<WatermarkConfig>({ enabled: false, opacity: 0.15 });
  const [qrConfig, setQrConfig] = useState<QrConfig>({ enabled: false, position: { x: 0.85, y: 0.85, width: 0.1, height: 0.1 } });
  const [activeId, setActiveId] = useState<string | null>(null);

  const canvasItems: EditableItem[] = useMemo(() => {
    const items: EditableItem[] = [];
    logos.forEach((l) => items.push({ id: l.id, label: l.name, position: l.position, kind: "image", imageUrl: l.assetUrl }));
    seals.forEach((s) => items.push({ id: s.id, label: s.name, position: s.position, kind: "image", imageUrl: s.assetUrl }));
    signatures.forEach((s) => items.push({ id: s.id, label: s.name, position: s.position, kind: "image", imageUrl: s.assetUrl }));
    if (studentNameField.enabled) {
      items.push({
        id: "studentName",
        label: "Student Name",
        position: studentNameField.position,
        kind: "text",
        textPreview: applyCaseTransform(SAMPLE_DATA.student_name, studentNameField.caseTransform),
        fontSize: studentNameField.fontSize,
        fontColor: studentNameField.color,
        fontFamily: getFontOption(studentNameField.fontFamily).cssFamily,
        verticalAlign: "bottom",
      });
    }
    if (regNumberField.enabled) {
      items.push({
        id: "regNumber",
        label: "Registration Number",
        position: regNumberField.position,
        kind: "text",
        textPreview: renderPreviewText(regNumberField.format || "{{registration_number}}"),
        fontSize: regNumberField.fontSize,
        fontColor: regNumberField.color,
        fontFamily: getFontOption(regNumberField.fontFamily).cssFamily,
        verticalAlign: "bottom",
      });
    }
    textBlocks.forEach((t) => items.push({ id: t.id, label: "Text block", position: t.position, kind: "text", textPreview: renderPreviewText(t.content), fontSize: t.fontSize, fontColor: t.color }));
    if (watermark.enabled && watermark.assetUrl && watermark.position) {
      items.push({ id: "watermark", label: "Watermark", position: watermark.position, kind: "image", imageUrl: watermark.assetUrl });
    }
    if (qrConfig.enabled && qrConfig.position) {
      items.push({ id: "qr", label: "QR Code", position: qrConfig.position, kind: "text", textPreview: "[QR]" });
    }
    return items;
  }, [logos, seals, signatures, studentNameField, regNumberField, textBlocks, watermark, qrConfig]);

  function updatePosition(id: string, pos: Position) {
    setLogos((prev) => prev.map((l) => (l.id === id ? { ...l, position: pos } : l)));
    setSeals((prev) => prev.map((s) => (s.id === id ? { ...s, position: pos } : s)));
    setSignatures((prev) => prev.map((s) => (s.id === id ? { ...s, position: pos } : s)));
    if (id === "studentName") setStudentNameField((f) => ({ ...f, position: pos }));
    if (id === "regNumber") setRegNumberField((f) => ({ ...f, position: pos }));
    if (id === "watermark") setWatermark((w) => ({ ...w, position: pos }));
    if (id === "qr") setQrConfig((q) => ({ ...q, position: pos }));
    setTextBlocks((prev) => prev.map((t) => (t.id === id ? { ...t, position: pos } : t)));
  }

  async function uploadFile(file: File, subdir: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("subdir", subdir);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  }

  async function handleBgUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const data = await uploadFile(file, "templates");
      setBg({ url: data.url, width: data.width || 1600, height: data.height || 1131, orientation: data.orientation || "landscape" });
    } catch {
      setError("Failed to upload background image");
    } finally {
      setUploading(false);
    }
  }

  async function addOverlay(kind: "logo" | "seal" | "signature", file: File) {
    setUploading(true);
    setError(null);
    try {
      const data = await uploadFile(file, kind === "logo" ? "assets/logos" : kind === "seal" ? "assets/seals" : "assets/signatures");
      const base = { id: newId(), name: file.name.split(".")[0], assetUrl: data.url, position: { ...DEFAULT_POS } };
      // also persist reusable asset
      await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: kind, name: base.name, filePath: data.url, width: data.width, height: data.height }),
      });
      if (kind === "logo") setLogos((p) => arrangeLogosTopRow([...p, base]));
      if (kind === "seal") setSeals((p) => [...p, base]);
      if (kind === "signature") setSignatures((p) => [...p, { ...base, designation: "" }]);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleWatermarkUpload(file: File) {
    setUploading(true);
    try {
      const data = await uploadFile(file, "assets/watermarks");
      setWatermark((w) => ({ ...w, assetUrl: data.url, position: w.position || { x: 0.25, y: 0.25, width: 0.5, height: 0.5 } }));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!bg || !name) {
      setError("Template name and background are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          backgroundPath: bg.url,
          width: bg.width,
          height: bg.height,
          orientation: bg.orientation,
          logos,
          seals,
          signatures,
          studentNameField,
          regNumberField,
          textBlocks,
          watermark,
          qrConfig,
          status: "complete",
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const template = await res.json();
      router.push(`/templates/${template.id}`);
    } catch {
      setError("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">New Template</h1>

      {/* Step indicator */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              i === step ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left: step form */}
        <Card className="min-w-0">
          <CardContent className="space-y-4 p-5">
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Template name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Workshop Completion Certificate" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Background image (PNG/JPG)</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => e.target.files?.[0] && handleBgUpload(e.target.files[0])}
                  />
                  {bg && (
                    <p className="mt-2 text-xs text-slate-500">
                      {bg.width}x{bg.height}px, {bg.orientation}
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 1 && (
              <OverlayStep
                title="Logos"
                items={logos}
                onAdd={(f) => addOverlay("logo", f)}
                onRemove={(id) => setLogos((p) => arrangeLogosTopRow(p.filter((l) => l.id !== id)))}
                onRename={(id, val) => setLogos((p) => p.map((l) => (l.id === id ? { ...l, name: val } : l)))}
                uploading={uploading}
                reorderable
                onReorder={(from, to) =>
                  setLogos((p) => {
                    const next = [...p];
                    const [moved] = next.splice(from, 1);
                    next.splice(to, 0, moved);
                    return arrangeLogosTopRow(next);
                  })
                }
                helperText="Logos are placed left-to-right across the top in the order they're added. Drag to reorder."
              />
            )}

            {step === 2 && (
              <OverlayStep
                title="Seals / Badges (optional)"
                items={seals}
                onAdd={(f) => addOverlay("seal", f)}
                onRemove={(id) => setSeals((p) => p.filter((s) => s.id !== id))}
                onRename={(id, val) => setSeals((p) => p.map((s) => (s.id === id ? { ...s, name: val } : s)))}
                uploading={uploading}
              />
            )}

            {step === 3 && (
              <div className="space-y-3">
                <h3 className="font-medium">Signatures</h3>
                <input type="file" accept="image/png,image/jpeg" onChange={(e) => e.target.files?.[0] && addOverlay("signature", e.target.files[0])} />
                {signatures.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded border p-2">
                    <img src={s.assetUrl} className="h-10 w-16 object-contain" alt={s.name} />
                    <Input className="w-32" value={s.name} onChange={(e) => setSignatures((p) => p.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))} placeholder="Name" />
                    <Input className="w-32" value={s.designation} onChange={(e) => setSignatures((p) => p.map((x) => (x.id === s.id ? { ...x, designation: e.target.value } : x)))} placeholder="Designation" />
                    <button className="ml-auto text-xs text-red-600" onClick={() => setSignatures((p) => p.filter((x) => x.id !== s.id))}>Remove</button>
                  </div>
                ))}
              </div>
            )}

            {step === 4 && (
              <TextFieldEditor
                title="Student Name Field"
                field={studentNameField}
                onChange={setStudentNameField}
                showEnableToggle
                enableLabel="Show student name on certificate"
                showCaseTransform
              />
            )}

            {step === 5 && (
              <TextFieldEditor
                title="Registration Number Field"
                field={regNumberField}
                onChange={setRegNumberField}
                showFormat
                showEnableToggle
                enableLabel="Show registration number on certificate"
              />
            )}

            {step === 6 && (
              <div className="space-y-3">
                <h3 className="font-medium">Certificate Content (text blocks)</h3>
                <p className="text-xs text-slate-500">
                  Use placeholders: {"{{student_name}} {{registration_number}} {{date}} {{event_name}} {{organization}} {{college}} {{department}}"} or custom {"{{your_field}}"}
                </p>
                {textBlocks.map((tb) => (
                  <div key={tb.id} className="space-y-2 rounded border p-3">
                    <textarea
                      className="w-full rounded border border-slate-300 p-2 text-sm"
                      rows={3}
                      value={tb.content}
                      onChange={(e) => setTextBlocks((p) => p.map((x) => (x.id === tb.id ? { ...x, content: e.target.value } : x)))}
                    />
                    <div className="flex gap-2">
                      <Input type="number" className="w-20" value={tb.fontSize} onChange={(e) => setTextBlocks((p) => p.map((x) => (x.id === tb.id ? { ...x, fontSize: Number(e.target.value) } : x)))} />
                      <ColorPicker value={tb.color} onChange={(hex) => setTextBlocks((p) => p.map((x) => (x.id === tb.id ? { ...x, color: hex } : x)))} />
                      <select value={tb.align} className="rounded border border-slate-300 px-2 text-sm" onChange={(e) => setTextBlocks((p) => p.map((x) => (x.id === tb.id ? { ...x, align: e.target.value as "left" | "center" | "right" } : x)))}>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                      <button className="ml-auto text-xs text-red-600" onClick={() => setTextBlocks((p) => p.filter((x) => x.id !== tb.id))}>Remove</button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTextBlocks((p) => [
                      ...p,
                      { id: newId(), content: "", position: { ...DEFAULT_POS }, fontFamily: "Helvetica", fontSize: 14, color: "#111111", align: "center" },
                    ])
                  }
                >
                  + Add text block
                </Button>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={watermark.enabled} onChange={(e) => setWatermark((w) => ({ ...w, enabled: e.target.checked }))} />
                    Enable watermark
                  </label>
                  {watermark.enabled && (
                    <div className="mt-2 space-y-2">
                      <input type="file" accept="image/png" onChange={(e) => e.target.files?.[0] && handleWatermarkUpload(e.target.files[0])} />
                      <label className="block text-xs">Opacity</label>
                      <input type="range" min={0} max={1} step={0.05} value={watermark.opacity} onChange={(e) => setWatermark((w) => ({ ...w, opacity: Number(e.target.value) }))} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={qrConfig.enabled} onChange={(e) => setQrConfig((q) => ({ ...q, enabled: e.target.checked, position: q.position || { x: 0.85, y: 0.85, width: 0.1, height: 0.1 } }))} />
                    Enable QR code (links to /verify/[certificateId])
                  </label>
                </div>
              </div>
            )}

            {step === 8 && (
              <div className="space-y-3 text-sm">
                <h3 className="font-medium">Review</h3>
                <ul className="space-y-1 text-slate-600">
                  <li>Name: <strong>{name || "(not set)"}</strong></li>
                  <li>Background: {bg ? `${bg.width}x${bg.height} (${bg.orientation})` : "(not uploaded)"}</li>
                  <li>Logos: {logos.length}</li>
                  <li>Seals: {seals.length}</li>
                  <li>Signatures: {signatures.length}</li>
                  <li>Text blocks: {textBlocks.length}</li>
                  <li>Watermark: {watermark.enabled ? "enabled" : "disabled"}</li>
                  <li>QR code: {qrConfig.enabled ? "enabled" : "disabled"}</li>
                </ul>
                <Button onClick={handleSave} disabled={saving || !bg || !name}>
                  {saving ? "Saving..." : "Save Template"}
                </Button>
                {(!bg || !name) && (
                  <p className="text-xs text-amber-600">
                    To save, {[!name && "enter a template name", !bg && "upload a background image"].filter(Boolean).join(" and ")} in{" "}
                    <button className="underline" onClick={() => setStep(0)}>Step 1</button>.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" size="sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                Back
              </Button>
              {step < STEPS.length - 1 && (
                <Button size="sm" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                  Next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: live preview */}
        <Card className="min-w-0">
          <CardContent className="p-5">
            <p className="mb-2 text-sm font-medium text-slate-600">Live Preview (drag/resize to fine-tune)</p>
            {bg ? (
              <CanvasEditor
                backgroundUrl={bg.url}
                naturalWidth={bg.width}
                naturalHeight={bg.height}
                items={canvasItems}
                activeId={activeId}
                onSelect={setActiveId}
                onChange={updatePosition}
                maxWidth={500}
              />
            ) : (
              <div className="flex h-64 items-center justify-center rounded border border-dashed border-slate-300 text-sm text-slate-400">
                Upload a background in Step 1 to preview
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OverlayStep({
  title,
  items,
  onAdd,
  onRemove,
  onRename,
  uploading,
  reorderable,
  onReorder,
  helperText,
}: {
  title: string;
  items: ImageOverlay[];
  onAdd: (f: File) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, val: string) => void;
  uploading: boolean;
  reorderable?: boolean;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  helperText?: string;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <h3 className="font-medium">{title}</h3>
      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
      <input type="file" accept="image/png,image/jpeg" disabled={uploading} onChange={(e) => e.target.files?.[0] && onAdd(e.target.files[0])} />
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable={reorderable}
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => {
            if (!reorderable) return;
            e.preventDefault();
            setOverIndex(index);
          }}
          onDragEnd={() => {
            setDragIndex(null);
            setOverIndex(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex !== null && dragIndex !== index) onReorder?.(dragIndex, index);
            setDragIndex(null);
            setOverIndex(null);
          }}
          className={`flex items-center gap-2 rounded border p-2 ${reorderable ? "cursor-grab active:cursor-grabbing" : ""} ${
            overIndex === index && dragIndex !== null && dragIndex !== index ? "border-indigo-400 bg-indigo-50" : ""
          }`}
        >
          {reorderable && <span className="select-none text-slate-400" title="Drag to reorder">⠿</span>}
          <span className="w-5 text-center text-xs font-semibold text-slate-400">{index + 1}</span>
          <img src={item.assetUrl} className="h-10 w-10 object-contain" alt={item.name} />
          <Input value={item.name} onChange={(e) => onRename(item.id, e.target.value)} className="w-40" />
          <button className="ml-auto text-xs text-red-600" onClick={() => onRemove(item.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}

function TextFieldEditor({
  title,
  field,
  onChange,
  showCaseTransform,
  showFormat,
  showEnableToggle,
  enableLabel,
}: {
  title: string;
  field: TextFieldConfig;
  onChange: (f: TextFieldConfig) => void;
  showCaseTransform?: boolean;
  showFormat?: boolean;
  showEnableToggle?: boolean;
  enableLabel?: string;
}) {
  const disabled = showEnableToggle && !field.enabled;
  return (
    <div className="space-y-3">
      <h3 className="font-medium">{title}</h3>
      {showEnableToggle && (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={!!field.enabled} onChange={(e) => onChange({ ...field, enabled: e.target.checked })} />
          {enableLabel || "Enable this field"}
        </label>
      )}
      <div className={`grid grid-cols-2 gap-2 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
        <div>
          <label className="block text-xs">Font</label>
          <select className="w-full rounded border border-slate-300 px-2 py-1 text-sm" value={field.fontFamily} onChange={(e) => onChange({ ...field, fontFamily: e.target.value })}>
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs">Font size</label>
          <Input type="number" value={field.fontSize} onChange={(e) => onChange({ ...field, fontSize: Number(e.target.value) })} />
        </div>
        <div>
          <label className="block text-xs">Color</label>
          <ColorPicker value={field.color} onChange={(hex) => onChange({ ...field, color: hex })} />
        </div>
        {showCaseTransform && (
          <div>
            <label className="block text-xs">Case</label>
            <select className="w-full rounded border border-slate-300 px-2 py-1 text-sm" value={field.caseTransform} onChange={(e) => onChange({ ...field, caseTransform: e.target.value as TextFieldConfig["caseTransform"] })}>
              <option value="none">As-is</option>
              <option value="upper">UPPERCASE</option>
              <option value="lower">lowercase</option>
              <option value="title">Title Case</option>
            </select>
          </div>
        )}
        {showFormat && (
          <div className="col-span-2">
            <label className="block text-xs">Format string</label>
            <Input value={field.format} onChange={(e) => onChange({ ...field, format: e.target.value })} placeholder="({{registration_number}})" />
          </div>
        )}
      </div>
    </div>
  );
}
