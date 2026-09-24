import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
        <Link href="/templates/new"><Button>New Template</Button></Link>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {templates.map((t) => (
          <Link key={t.id} href={`/templates/${t.id}`}>
            <Card className="overflow-hidden hover:shadow-md">
              <div className="aspect-video bg-slate-100">
                <img src={t.backgroundPath} alt={t.name} className="h-full w-full object-cover" />
              </div>
              <CardContent className="p-3">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-slate-500">{t.width}x{t.height} · {t.orientation}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {templates.length === 0 && <p className="text-sm text-slate-500">No templates yet.</p>}
      </div>
    </div>
  );
}
