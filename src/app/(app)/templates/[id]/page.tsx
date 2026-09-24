import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { GenerationPanel } from "@/components/templates/generation-panel";
import { NameFieldSettings } from "@/components/templates/name-field-settings";
import { DeleteTemplateButton } from "@/components/templates/delete-template-button";

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) notFound();

  const logos = JSON.parse(template.logos);
  const seals = JSON.parse(template.seals);
  const signatures = JSON.parse(template.signatures);
  const textBlocks = JSON.parse(template.textBlocks);
  const watermark = JSON.parse(template.watermark);
  const qrConfig = JSON.parse(template.qrConfig);
  const studentNameField = {
    position: { x: 0.3, y: 0.45, width: 0.4, height: 0.08 },
    fontSize: 28,
    color: "#111111",
    caseTransform: "none",
    ...JSON.parse(template.studentNameField),
  };
  const regNumberField = {
    position: { x: 0.4, y: 0.58, width: 0.2, height: 0.05 },
    fontSize: 12,
    color: "#333333",
    format: "({{registration_number}})",
    ...JSON.parse(template.regNumberField),
  };
  const qrConfigForSettings = {
    enabled: false,
    position: { x: 0.85, y: 0.85, width: 0.1, height: 0.1 },
    ...JSON.parse(template.qrConfig),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{template.name}</h1>
        <DeleteTemplateButton templateId={template.id} templateName={template.name} redirectTo="/templates" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <img src={template.backgroundPath} alt={template.name} className="w-full rounded border" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <p><strong>Size:</strong> {template.width}x{template.height} ({template.orientation})</p>
            <p><strong>Logos:</strong> {logos.length}</p>
            <p><strong>Seals:</strong> {seals.length}</p>
            <p><strong>Signatures:</strong> {signatures.length}</p>
            <p><strong>Text blocks:</strong> {textBlocks.length}</p>
            <p><strong>Watermark:</strong> {watermark.enabled ? "enabled" : "disabled"}</p>
            <p><strong>QR code:</strong> {qrConfig.enabled ? "enabled" : "disabled"}</p>
            <p><strong>Status:</strong> {template.status}</p>
          </CardContent>
        </Card>
      </div>

      <NameFieldSettings
        templateId={template.id}
        backgroundUrl={template.backgroundPath}
        naturalWidth={template.width}
        naturalHeight={template.height}
        initialStudentNameField={studentNameField}
        initialRegNumberField={regNumberField}
        initialQrConfig={qrConfigForSettings}
      />

      <GenerationPanel templateId={template.id} />
    </div>
  );
}
