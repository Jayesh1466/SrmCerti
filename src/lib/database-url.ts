// Resolve Postgres connection strings from whichever variables the hosting setup provides.
// Neon's Vercel integration may add a custom prefix (e.g. "myprefix_DATABASE_URL") and also sets
// POSTGRES_* aliases, so accept those when the canonical names are missing or empty.

type Env = Record<string, string | undefined>;

function firstSet(env: Env, names: string[], suffixes: string[]): { name: string; value: string } | undefined {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return { name, value };
  }
  for (const suffix of suffixes) {
    const name = Object.keys(env)
      .sort()
      .find((k) => k.endsWith("_" + suffix) && env[k]?.trim());
    if (name) return { name, value: env[name]!.trim() };
  }
  return undefined;
}

// Pooled connection, used by the running app.
export function resolvePooledUrl(env: Env = process.env) {
  return firstSet(env, ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"], ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"]);
}

// Direct (unpooled) connection, used by migrations; falls back to the pooled one.
export function resolveDirectUrl(env: Env = process.env) {
  return (
    firstSet(env, ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"], ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"]) ??
    resolvePooledUrl(env)
  );
}
