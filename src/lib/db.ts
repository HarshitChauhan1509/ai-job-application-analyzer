import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "path";

// Initialize the database adapter dynamically based on DATABASE_URL
const dbUrl = process.env.DATABASE_URL || `file:${path.join(process.cwd(), "dev.db")}`;
const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

const adapter: any = isPostgres
  ? new PrismaPg(dbUrl)
  : new PrismaLibSql({ url: dbUrl });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
