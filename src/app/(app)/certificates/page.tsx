import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export default async function CertificatesPage() {
  const certificates = await prisma.certificate.findMany({
    orderBy: { createdAt: "desc" },
    include: { project: { include: { template: true } } },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Certificates</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="p-3">Student</th>
                <th>Reg Number</th>
                <th>Template</th>
                <th>Certificate ID</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3">{c.studentName}</td>
                  <td>{c.regNumber}</td>
                  <td>
                    <Link href={`/templates/${c.project.templateId}`} className="text-blue-600 hover:underline">
                      {c.project.template.name}
                    </Link>
                  </td>
                  <td className="font-mono text-xs">{c.certificateId}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "generated" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{c.status}</span>
                  </td>
                  <td className="space-x-3 p-3 text-right">
                    {c.filePath && <a className="text-blue-600 hover:underline" href={c.filePath} target="_blank" rel="noreferrer">Download</a>}
                    <a className="text-slate-600 hover:underline" href={`/verify/${c.certificateId}`} target="_blank" rel="noreferrer">Verify</a>
                  </td>
                </tr>
              ))}
              {certificates.length === 0 && (
                <tr><td colSpan={6} className="p-3 text-slate-500">No certificates generated yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
