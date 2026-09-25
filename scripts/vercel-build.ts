// Vercel build: resolve database URLs, apply migrations, seed the admin user, then build Next.js.
// Run via `npm run vercel-build` (Vercel prefers this script over `build`).
import { execSync } from "child_process";
import { resolveDirectUrl, resolvePooledUrl } from "../src/lib/database-url";

const pooled = resolvePooledUrl();
const direct = resolveDirectUrl();

if (!pooled || !direct) {
  const dbVars = Object.keys(process.env).filter((k) => /DATABASE|POSTGRES|PG/.test(k));
  console.error(
    "No database connection string found. Set DATABASE_URL (and ideally DATABASE_URL_UNPOOLED) in the Vercel project's " +
      `environment variables. Database-related variables present (names only): ${dbVars.join(", ") || "none"}`
  );
  process.exit(1);
}

// Names only — never print connection strings, they contain the password.
console.log(`Using ${pooled.name} for the app and ${direct.name} for migrations.`);

const env = { ...process.env, DATABASE_URL: pooled.value, DATABASE_URL_UNPOOLED: direct.value };
const run = (cmd: string) => execSync(cmd, { stdio: "inherit", env });

run("prisma generate");
run("prisma migrate deploy");
run("prisma db seed");
run("next build");
