"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/ui/color-picker";
import { CanvasEditor, EditableItem } from "@/components/wizard/canvas-editor";
import { FONT_OPTIONS, getFontOption } from "@/lib/fonts";
import type { TextFieldConfig, Position, QrConfig } from "@/lib/types";

const SAMPLE_NAME = "Jayesh D";
const SAMPLE_REG = "RA2311001";
const DEFAULT_QR_POSITION: Position = { x: 0.85, y: 0.85, width: 0.1, height: 0.1 };

function applyCaseTransform(text: string, transform?: TextFieldConfig["caseTransform"]): string {
  if (transform === "upper") return text.toUpperCase();
  if (transform === "lower") return text.toLowerCase();
  if (transform === "title") return text.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  return text;
}

export function NameFieldSettings({
  templateId,
  backgroundUrl,
  naturalWidth,
  naturalHeight,
  initialStudentNameField,
  initialRegNumberField,
  initialQrConfig,
}: {
  templateId: string;
  backgroundUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  initialStudentNameField: TextFieldConfig;
  initialRegNumberField: TextFieldConfig;
  initialQrConfig: QrConfig;
}) {
  const [studentNameField, setStudentNameField] = useState<TextFieldConfig>(initialStudentNameField);
  const [regNumberField, setRegNumberField] = useState<TextFieldConfig>(initialRegNumberField);
  const [qrConfig, setQrConfig] = useState<QrConfig>(initialQrConfig);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canvasItems: EditableItem[] = useMemo(() => {
    const items: EditableItem[] = [];
    if (studentNameField.enabled) {
      items.push({
        id: "studentName",
        label: "Student Name",
        position: studentNameField.position,
        kind: "text",
        textPreview: applyCaseTransform(SAMPLE_NAME, studentNameField.caseTransform),
        fontSize: studentNameField.fontSize,
        fontColor: studentNameField.color,
        fontFamily: getFontOption(studentNameField.fontFamily).cssFamily,
        align: "left",
        verticalAlign: "bottom",
      });
    }
    if (regNumberField.enabled) {
      items.push({
        id: "regNumber",
        label: "Registration Number",
        position: regNumberField.position,
        kind: "text",
        textPreview: (regNumberField.format || "{{registration_number}}").replace("{{registration_number}}", SAMPLE_REG),
        fontSize: regNumberField.fontSize,
        fontColor: regNumberField.color,
        fontFamily: getFontOption(regNumberField.fontFamily).cssFamily,
        align: "left",
        verticalAlign: "bottom",
      });
    }
    if (qrConfig.enabled) {
      items.push({
        id: "qr",
        label: "QR Code",
        position: qrConfig.position || DEFAULT_QR_POSITION,
        kind: "text",
        textPreview: "[QR]",
      });
    }
    return items;
  }, [studentNameField, regNumberField, qrConfig]);

  function updatePosition(id: string, pos: Position) {
    if (id === "studentName") setStudentNameField((f) => ({ ...f, position: pos }));
    if (id === "regNumber") setRegNumberField((f) => ({ ...f, position: pos }));
    if (id === "qr") setQrConfig((q) => ({ ...q, position: pos }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNameField: { ...studentNameField, position: studentNameField.position },
          regNumberField: { ...regNumberField, position: regNumberField.position },
          qrConfig: { ...qrConfig, position: qrConfig.position || DEFAULT_QR_POSITION },
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Student Name, Registration Number &amp; QR Code</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="min-w-0 space-y-5">
        <p className="text-xs text-slate-500">
          Drag the boxes on the preview to position them &mdash; this position is used for every student when certificates are generated.
        </p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={!!studentNameField.enabled}
              onChange={(e) => setStudentNameField((f) => ({ ...f, enabled: e.target.checked }))}
            />
            Show student name on certificate
          </label>
          {studentNameField.enabled && (
            <div className={FIELD_GRID}>
              <Field label="Font">
                <select
                  className={SELECT_CLASS}
                  value={studentNameField.fontFamily || "Helvetica"}
                  onChange={(e) => setStudentNameField((f) => ({ ...f, fontFamily: e.target.value }))}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Size">
                <Input
                  type="number"
                  className="h-9 w-full"
                  value={studentNameField.fontSize}
                  onChange={(e) => setStudentNameField((f) => ({ ...f, fontSize: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Color">
                <ColorPicker
                  value={studentNameField.color}
                  onChange={(hex) => setStudentNameField((f) => ({ ...f, color: hex }))}
                />
              </Field>
              <Field label="Case">
                <select
                  className={SELECT_CLASS}
                  value={studentNameField.caseTransform || "none"}
                  onChange={(e) => setStudentNameField((f) => ({ ...f, caseTransform: e.target.value as TextFieldConfig["caseTransform"] }))}
                >
                  <option value="none">As-is</option>
                  <option value="upper">UPPERCASE</option>
                  <option value="lower">lowercase</option>
                  <option value="title">Title Case</option>
                </select>
              </Field>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={!!regNumberField.enabled}
              onChange={(e) => setRegNumberField((f) => ({ ...f, enabled: e.target.checked }))}
            />
            Show registration number on certificate
          </label>
          {regNumberField.enabled && (
            <div className={FIELD_GRID}>
              <Field label="Format" className="col-span-3">
                <Input
                  className="h-9 w-full"
                  value={regNumberField.format || ""}
                  onChange={(e) => setRegNumberField((f) => ({ ...f, format: e.target.value }))}
                  placeholder="({{registration_number}})"
                />
              </Field>
              <Field label="Font">
                <select
                  className={SELECT_CLASS}
                  value={regNumberField.fontFamily || "Helvetica"}
                  onChange={(e) => setRegNumberField((f) => ({ ...f, fontFamily: e.target.value }))}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Size">
                <Input
                  type="number"
                  className="h-9 w-full"
                  value={regNumberField.fontSize}
                  onChange={(e) => setRegNumberField((f) => ({ ...f, fontSize: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Color">
                <ColorPicker
                  value={regNumberField.color}
                  onChange={(hex) => setRegNumberField((f) => ({ ...f, color: hex }))}
                />
              </Field>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={!!qrConfig.enabled}
              onChange={(e) =>
                setQrConfig((q) => ({
                  ...q,
                  enabled: e.target.checked,
                  position: q.position || DEFAULT_QR_POSITION,
                }))
              }
            />
            Show QR code (links to certificate verification page)
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          {saved && <span className="text-xs text-green-600">Saved</span>}
        </div>
      </div>

      <div className="min-w-0">
        <p className="mb-2 text-sm font-medium text-slate-600">Live position preview</p>
        {canvasItems.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded border border-dashed border-slate-300 text-sm text-slate-400">
            Enable a field on the left to position it
          </div>
        ) : (
          <CanvasEditor
            backgroundUrl={backgroundUrl}
            naturalWidth={naturalWidth}
            naturalHeight={naturalHeight}
            items={canvasItems}
            activeId={activeId}
            onSelect={setActiveId}
            onChange={updatePosition}
            maxWidth={480}
          />
        )}
      </div>
      </CardContent>
    </Card>
  );
}

// Shared column layout so Font / Size / Color line up across every field group.
const FIELD_GRID = "ml-6 grid grid-cols-[minmax(0,1fr)_5rem_auto] items-end gap-x-3 gap-y-3";
const SELECT_CLASS = "h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm";

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
