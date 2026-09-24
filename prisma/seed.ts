import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Deployed environments must supply their own admin credentials; the defaults are for local dev only.
  const adminEmail = process.env.ADMIN_EMAIL || "admin@certiflow.com";
  const adminPassword = process.env.ADMIN_PASSWORD || (process.env.VERCEL ? "" : "admin123");
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD must be set to seed the admin user on a deployed environment.");
  }
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
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
