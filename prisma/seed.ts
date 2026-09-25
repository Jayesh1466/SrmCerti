import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Deployed environments must supply their own admin credentials; the defaults are for local dev only.
  const adminEmail = process.env.ADMIN_EMAIL || "admin@certiflow.com";
  const adminPassword = process.env.ADMIN_PASSWORD || (process.env.VERCEL ? "" : "admin123");
  if (!adminPassword) {
    // Don't fail the deploy over this: the app can still ship, it just can't be logged into until an admin exists.
    const users = await prisma.user.count();
    console.warn(
      users > 0
        ? "ADMIN_PASSWORD is not set; keeping the existing admin account(s) unchanged."
        : "WARNING: ADMIN_PASSWORD is not set and no admin account exists yet, so nobody can log in. " +
            "Add ADMIN_EMAIL and ADMIN_PASSWORD in the Vercel project's Environment Variables and redeploy."
    );
    return;
  }
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    // When ADMIN_PASSWORD is set explicitly, (re)apply it so changing it in Vercel takes effect on the next deploy.
    update: process.env.ADMIN_PASSWORD ? { passwordHash } : {},
    create: {
      email: adminEmail,
      passwordHash,
      name: "CertiFlow Admin",
    },
  });
  console.log(`Seeded admin user: ${adminEmail}`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
