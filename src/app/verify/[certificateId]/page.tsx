import { prisma } from "@/lib/db";
import { CheckCircle2, XCircle } from "lucide-react";
import { CertificateViewer } from "@/components/verify/certificate-viewer";

export default async function VerifyPage({ params }: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await params;
  const cert = await prisma.certificate.findUnique({
    where: { certificateId },
    include: { project: true },
  });

  const valid = !!cert && cert.status === "generated";
  const data = cert ? JSON.parse(cert.data || "{}") : {};

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-50 px-4 py-8 sm:items-center">
      <div className={`w-full rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8 ${valid && cert?.filePath ? "max-w-3xl" : "max-w-md"}`}>
        {valid ? (
          <>
            <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-green-600" />
            <h1 className="text-xl font-bold text-slate-900">Certificate Verified</h1>
            <p className="mb-4 text-sm text-slate-500">This certificate is authentic and was issued by SRMcerti.</p>
            <div className="mx-auto max-w-md space-y-2 rounded-md bg-slate-50 p-4 text-left text-sm">
              <Row label="Student Name" value={cert!.studentName} />
              <Row label="Registration Number" value={cert!.regNumber} />
              {data.event_name && <Row label="Event" value={data.event_name} />}
              {data.organization && <Row label="Organization" value={data.organization} />}
              {data.date && <Row label="Date" value={data.date} />}
              <Row label="Certificate ID" value={cert!.certificateId} mono />
              <Row label="Project" value={cert!.project.name} />
            </div>
            {cert!.filePath && (
              <div className="mt-6">
                <CertificateViewer pdfUrl={`/api/verify/${encodeURIComponent(cert!.certificateId)}/pdf`} />
              </div>
            )}
          </>
        ) : (
          <>
            <XCircle className="mx-auto mb-3 h-14 w-14 text-red-600" />
            <h1 className="text-xl font-bold text-slate-900">Certificate Not Found</h1>
            <p className="text-sm text-slate-500">
              We could not verify a certificate with ID <span className="font-mono">{certificateId}</span>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className={`text-right ${mono ? "break-all font-mono" : "font-medium"}`}>{value}</span>
    </div>
  );
}
