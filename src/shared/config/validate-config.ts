type Env = Record<string, string | undefined>;

export function validateConfig(config: Env) {
  const required = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "ENCRYPTION_KEY"];
  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0 && config.NODE_ENV !== "test") {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  return {
    ...config,
    PORT: Number(config.PORT ?? 4000),
    REDIS_PORT: Number(config.REDIS_PORT ?? 6379)
  };
}
