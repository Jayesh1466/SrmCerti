import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "admin@certiflow.com";
const DEMO_PASSWORD = "admin123";

async function main() {
  const deployed = !!process.env.VERCEL;

  if (!deployed) {
    // Local development: a known demo login is convenient and harmless.
    const email = process.env.ADMIN_EMAIL || DEMO_EMAIL;
    const password = process.env.ADMIN_PASSWORD || DEMO_PASSWORD;
    await upsertAdmin(email, password, !!process.env.ADMIN_PASSWORD);
    console.log(`Seeded admin user: ${email}`);
    return;
  }

  // Deployed: the admin comes only from ADMIN_EMAIL / ADMIN_PASSWORD, never from the public demo credentials.
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const problem = !email
    ? "ADMIN_EMAIL is not set"
    : !password
      ? "ADMIN_PASSWORD is not set"
      : password === DEMO_PASSWORD
        ? "ADMIN_PASSWORD is the public demo password; choose a different one"
        : null;

  if (problem) {
    // Don't fail the deploy, but make sure the public demo account can't be used to log in.
    const removed = await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
    const users = await prisma.user.count();
    console.warn(
      `WARNING: ${problem}. Admin account left unchanged` +
        (removed.count ? `; removed the demo account ${DEMO_EMAIL}` : "") +
        (users === 0 ? ". No admin account exists, so nobody can log in" : "") +
        ". Set ADMIN_EMAIL and ADMIN_PASSWORD in the Vercel project's Environment Variables and redeploy."
    );
    return;
  }

  await upsertAdmin(email!, password!, true);
  // Single-admin app: remove any other account (e.g. the demo login or an earlier ADMIN_EMAIL).
  const removed = await prisma.user.deleteMany({ where: { email: { not: email } } });
  console.log(`Seeded admin user: ${email}` + (removed.count ? ` (removed ${removed.count} other account(s))` : ""));
}

async function upsertAdmin(email: string, password: string, resetPassword: boolean) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    // When the password comes from ADMIN_PASSWORD, (re)apply it so changing it takes effect on the next deploy.
    update: resetPassword ? { passwordHash } : {},
    create: { email, passwordHash, name: "CertiFlow Admin" },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
