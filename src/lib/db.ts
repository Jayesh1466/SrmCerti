import { PrismaClient } from "@prisma/client";
import { resolvePooledUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Falls back to prefixed/aliased Neon variables when DATABASE_URL itself isn't set.
    datasourceUrl: resolvePooledUrl()?.value,
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
