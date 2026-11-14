import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const configured = process.env.DATABASE_URL ?? 'file:./dev.db';
const fileUrl = configured.startsWith('file:') ? configured : `file:${path.resolve(configured)}`;
const adapter = new PrismaBetterSqlite3({ url: fileUrl });

const prisma = new PrismaClient({
    adapter,
    log: ['info', 'warn', 'error'],
});

export default prisma;
