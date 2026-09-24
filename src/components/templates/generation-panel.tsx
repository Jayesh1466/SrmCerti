"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Certificate {
  id: string;
  certificateId: string;
  studentName: string;
  regNumber: string;
  status: string;
  filePath: string | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
  templateId: string;
  certificates: Certificate[];
  datasets: { id: string }[];
}

interface UploadResult {
  datasetId: string;
  headers: string[];
  rowCount: number;
  preview: Record<string, string>[];
  autoDetected: { student_name: string | null; registration_number: string | null };
}

interface MappingResult {
  totalRows: number;
  validRows: number;
  errorCount: number;
  duplicateCount: number;
  missingCount: number;
  errors: { rowIndex: number; reason: string }[];
}

const CUSTOM_FIELDS = ["date", "event_name", "organization", "college", "department"];

export function GenerationPanel({ templateId }: { templateId: string }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<{ total: number; completed: number; failed: number; status: string } | null>(null);
  const [previewRow, setPreviewRow] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async (id: string) => {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) setProject(await res.json());
  }, []);

  // Get-or-create the project backing this template's generation workflow.
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/templates/${templateId}/project`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setProjectId(data.id);
        loadProject(data.id);
      }
    })();
  }, [templateId, loadProject]);

  // Poll job status
  useEffect(() => {
    if (!jobId || !projectId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/projects/${projectId}/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(interval);
          loadProject(projectId);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [jobId, projectId, loadProject]);

  async function handleFileUpload(file: File) {
    if (!projectId) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/upload`, { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      const data: UploadResult = await res.json();
      setUploadResult(data);
      setMapping({
        student_name: data.autoDetected.student_name || "",
        registration_number: data.autoDetected.registration_number || "",
      });
      setMappingResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleValidate() {
    if (!uploadResult || !projectId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/mapping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: uploadResult.datasetId, mapping }),
      });
      const data = await res.json();
      setMappingResult(data);
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    if (!projectId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Generate failed");
      const data = await res.json();
      setJobId(data.jobId);
      setJob({ total: data.total, completed: 0, failed: 0, status: "running" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate(certId: string) {
    if (!projectId) return;
    await fetch(`/api/certificates/${certId}/regenerate`, { method: "POST" });
    loadProject(projectId);
  }

  if (!project || !projectId) return <p className="text-sm text-slate-500">Loading...</p>;

  const generatedCount = project.certificates.filter((c) => c.status === "generated").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Upload Data &amp; Generate Certificates</h2>
        {generatedCount > 0 && (
          <a href={`/api/projects/${projectId}/zip`}>
            <Button>Download ZIP ({generatedCount})</Button>
          </a>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader><CardTitle>1. Upload Student Dataset (Excel/CSV)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
          {uploadResult && (
            <p className="text-sm text-slate-600">
              Parsed {uploadResult.rowCount} rows. Columns: {uploadResult.headers.join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      {uploadResult && (
        <Card>
          <CardHeader><CardTitle>2. Column Mapping</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <MappingRow label="Student Name" target="student_name" headers={uploadResult.headers} mapping={mapping} setMapping={setMapping} required />
            <MappingRow label="Registration Number" target="registration_number" headers={uploadResult.headers} mapping={mapping} setMapping={setMapping} required />
            {CUSTOM_FIELDS.map((f) => (
              <MappingRow key={f} label={f} target={f} headers={uploadResult.headers} mapping={mapping} setMapping={setMapping} />
            ))}
            <Button size="sm" onClick={handleValidate} disabled={busy}>Validate</Button>

            {mappingResult && (
              <div className="mt-3 rounded border p-3 text-sm">
                <p>Total rows: {mappingResult.totalRows}</p>
                <p>Valid rows: {mappingResult.validRows}</p>
                <p>Errors: {mappingResult.errorCount} (missing: {mappingResult.missingCount}, duplicates: {mappingResult.duplicateCount})</p>
                {mappingResult.errors.length > 0 && (
                  <table className="mt-2 w-full text-xs">
                    <thead><tr className="text-left text-slate-500"><th>Row</th><th>Reason</th></tr></thead>
                    <tbody>
                      {mappingResult.errors.slice(0, 20).map((e, i) => (
                        <tr key={i}><td>{e.rowIndex + 1}</td><td>{e.reason}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {uploadResult && mappingResult && (
        <Card>
          <CardHeader><CardTitle>3. Preview a Certificate</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm">Row:</label>
              <input type="number" min={0} max={uploadResult.rowCount - 1} value={previewRow} onChange={(e) => setPreviewRow(Number(e.target.value))} className="w-20 rounded border border-slate-300 px-2 py-1 text-sm" />
              <Button size="sm" variant="outline" onClick={() => setShowPreview(true)}>Preview here</Button>
            </div>
            {showPreview && (
              <iframe
                key={previewRow}
                src={`/api/projects/${projectId}/preview?rowIndex=${previewRow}`}
                className="h-[600px] w-full rounded border border-slate-300"
                title="Certificate preview"
              />
            )}
          </CardContent>
        </Card>
      )}

      {uploadResult && mappingResult && (
        <Card>
          <CardHeader><CardTitle>4. Generate Certificates</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleGenerate} disabled={busy || job?.status === "running"}>
              {job?.status === "running" ? "Generating..." : "Generate All"}
            </Button>
            {job && (
              <div className="space-y-1">
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-slate-900 transition-all"
                    style={{ width: `${job.total ? ((job.completed + job.failed) / job.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {job.completed + job.failed} / {job.total} processed ({job.completed} ok, {job.failed} failed) — {job.status}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {project.certificates.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Generated Certificates</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2">Student</th>
                  <th>Reg Number</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {project.certificates.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2">{c.studentName}</td>
                    <td>{c.regNumber}</td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "generated" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{c.status}</span>
                    </td>
                    <td className="space-x-3 py-2 text-right">
                      {c.filePath && <a className="text-blue-600 hover:underline" href={c.filePath} target="_blank" rel="noreferrer">View</a>}
                      <button className="text-slate-600 hover:underline" onClick={() => handleRegenerate(c.id)}>Regenerate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MappingRow({
  label,
  target,
  headers,
  mapping,
  setMapping,
  required,
}: {
  label: string;
  target: string;
  headers: string[];
  mapping: Record<string, string>;
  setMapping: (m: Record<string, string>) => void;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-48 text-sm">
        {label} {required && <span className="text-red-500">*</span>} → {"{{" + target + "}}"}
      </label>
      <select
        className="rounded border border-slate-300 px-2 py-1 text-sm"
        value={mapping[target] || ""}
        onChange={(e) => setMapping({ ...mapping, [target]: e.target.value })}
      >
        <option value="">-- not mapped --</option>
        {headers.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
    </div>
  );
}
