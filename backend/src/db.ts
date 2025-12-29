import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';

// Resolve path relative to CWD or use absolute if provided
const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);

const connection = new Database(resolvedPath);
const adapter = new PrismaBetterSqlite3(connection as any);

const prisma = new PrismaClient({
    adapter,
    log: ['info', 'warn', 'error'],
});

export default prisma;
