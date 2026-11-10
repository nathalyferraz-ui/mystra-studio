import "dotenv/config";
import { defineConfig } from "prisma/config";
import { migrationDatabaseURL, environmentMode } from "./lib/environment";
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: migrationDatabaseURL(), shadowDatabaseUrl: ["demo", "homologation"].includes(environmentMode()) ? undefined : process.env.SHADOW_DATABASE_URL || undefined },
});
