import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const [templates, certCount, projectCount] = await Promise.all([
    prisma.template.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.certificate.count({ where: { status: "generated" } }),
    prisma.certificateProject.count(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <Link href="/templates/new"><Button>New Template</Button></Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Templates</p><p className="text-3xl font-bold">{templates.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Generation Projects</p><p className="text-3xl font-bold">{projectCount}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Certificates Generated</p><p className="text-3xl font-bold">{certCount}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Templates</CardTitle></CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-slate-500">No templates yet. Create one to get started.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2">Template</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{t.name}</td>
                    <td>{t.width}x{t.height} ({t.orientation})</td>
                    <td>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <Link href={`/templates/${t.id}`} className="text-blue-600 hover:underline">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
