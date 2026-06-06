import { and, desc, lt, or, sql, type SQL } from 'drizzle-orm';
import { DEFAULT_CURSOR_LIMIT, MAX_CURSOR_LIMIT } from '../config/constants.js';
import type { CursorPayload } from '../types/common.js';

export type PaginationParams = {
  cursor?: string;
  limit?: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function parsePagination(params: PaginationParams): { limit: number; cursorPayload: CursorPayload | null } {
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_CURSOR_LIMIT, 1), MAX_CURSOR_LIMIT);
  if (!params.cursor) {
    return { limit, cursorPayload: null };
  }

  const decoded = Buffer.from(params.cursor, 'base64url').toString('utf8');
  const parsed = JSON.parse(decoded) as CursorPayload;
  return { limit, cursorPayload: parsed };
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function buildCursorWhere(
  createdAtColumn: SQL,
  idColumn: SQL,
  cursor: CursorPayload | null
): SQL | undefined {
  if (!cursor) {
    return undefined;
  }
  return or(
    lt(createdAtColumn, sql`${new Date(cursor.createdAt).toISOString()}`),
    and(sql`${createdAtColumn} = ${new Date(cursor.createdAt).toISOString()}`, lt(idColumn, cursor.id))
  );
}

export function buildPaginatedResponse<T>(items: T[], limit: number): PaginatedResponse<T> {
  const sliced = items.slice(0, limit);
  const hasMore = items.length > limit;
  const last = sliced.at(-1) as { id?: string; createdAt?: Date | string } | undefined;

  let nextCursor: string | null = null;
  if (hasMore && last?.id && last?.createdAt) {
    const createdAtIso =
      typeof last.createdAt === 'string' ? new Date(last.createdAt).toISOString() : last.createdAt.toISOString();
    nextCursor = encodeCursor({ id: last.id, createdAt: createdAtIso });
  }

  return {
    data: sliced,
    hasMore,
    nextCursor
  };
}

export const orderByNewest = <T extends { createdAt: Date; id: string }>(rows: T[]): T[] => {
  return rows.sort((a, b) => {
    if (a.createdAt.getTime() === b.createdAt.getTime()) {
      return b.id.localeCompare(a.id);
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
};

export const orderByDesc = desc;
