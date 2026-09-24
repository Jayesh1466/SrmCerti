import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

// True if any template (background or overlay JSON) or asset still points at this file URL.
export async function isFileReferenced(url: string, ignore: { templateId?: string; assetId?: string } = {}) {
  const [templateUse, assetUse] = await Promise.all([
    prisma.template.count({
      where: {
        id: ignore.templateId ? { not: ignore.templateId } : undefined,
        OR: [
          { backgroundPath: url },
          { logos: { contains: url } },
          { seals: { contains: url } },
          { signatures: { contains: url } },
          { watermark: { contains: url } },
        ],
      },
    }),
    prisma.asset.count({
      where: { filePath: url, id: ignore.assetId ? { not: ignore.assetId } : undefined },
    }),
  ]);
  return templateUse + assetUse > 0;
}

// Delete a template along with its project, dataset, jobs and certificates.
// Files that nothing else references (background, generated PDFs) are removed from storage;
// overlay images belong to the asset library and are left alone.
export async function deleteTemplateCascade(templateId: string) {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    include: { projects: { include: { certificates: { select: { filePath: true } } } } },
  });
  if (!template) return false;

  const projectIds = template.projects.map((p) => p.id);
  const certificateFiles = template.projects.flatMap((p) => p.certificates.map((c) => c.filePath).filter((f): f is string => !!f));

  await prisma.$transaction([
    prisma.certificate.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.generationJob.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.studentDataset.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.certificateProject.deleteMany({ where: { id: { in: projectIds } } }),
    prisma.template.delete({ where: { id: templateId } }),
  ]);

  await Promise.all(certificateFiles.map((f) => storage.remove(f)));
  if (!(await isFileReferenced(template.backgroundPath))) {
    await storage.remove(template.backgroundPath);
  }
  return true;
}
