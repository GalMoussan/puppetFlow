import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Decode the actual database URL from Prisma's proxy URL format
 * The prisma+postgres:// URL embeds the real connection string in the api_key
 */
function getDatabaseUrl(): string {
  const proxyUrl = process.env.DATABASE_URL;
  if (!proxyUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Extract api_key from prisma+postgres:// URL
  const match = proxyUrl.match(/api_key=([^&]+)/);
  if (match) {
    try {
      const decoded = JSON.parse(Buffer.from(match[1], "base64").toString());
      return decoded.databaseUrl;
    } catch {
      // Fall back to proxy URL if decoding fails
    }
  }

  // If it's a direct postgres:// URL, use it as-is
  return proxyUrl.replace("prisma+postgres://", "postgres://");
}

function createPrismaClient(): PrismaClient {
  const connectionString = getDatabaseUrl();
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
