import { Prisma } from '@prisma/client';

/**
 * Models that are trashed rather than destroyed.
 *
 * A trashed row keeps its data and its relations; only `deletedAt` is set. Every
 * read of these models is filtered by the extension below, so the public site and
 * the admin lists hide trashed rows without a single per-query change.
 */
export const SOFT_DELETE_MODELS = ['Tournament', 'Team', 'Player', 'Match'] as const;

const MODEL_SET = new Set<string>(SOFT_DELETE_MODELS);

/** Reads that take a `where`, so the filter is just another condition. */
const WHERE_READS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

/** Reads addressed by a unique key, which cannot carry the filter — post-filtered instead. */
const UNIQUE_READS = new Set(['findUnique', 'findUniqueOrThrow']);

/**
 * Hides soft-deleted rows from every read of the four models.
 *
 * The alternative — adding `deletedAt: null` to each of the hundreds of call
 * sites that read these models — would be missed somewhere; this cannot be.
 * Writes are left untouched, so trashing, restoring and purging behave normally
 * (those paths use `prismaUnfiltered` anyway).
 *
 * Limitation: this filters top-level reads only. A trashed row can still surface
 * nested inside an `include` / `select` relation (for example a news article's
 * team or player dossier card) until it is restored.
 */
export const softDeleteExtension = Prisma.defineExtension((client) =>
  client.$extends({
    name: 'soft-delete',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !MODEL_SET.has(model)) return query(args);

          if (WHERE_READS.has(operation)) {
            const mutable = (args ?? {}) as Record<string, unknown>;
            mutable.where = {
              ...((mutable.where as Record<string, unknown>) ?? {}),
              deletedAt: null,
            };
            return query(mutable);
          }

          if (UNIQUE_READS.has(operation)) {
            const row = (await query(args)) as { deletedAt?: Date | null } | null;
            if (row && row.deletedAt) {
              if (operation === 'findUniqueOrThrow') throw new Error('No record found');
              return null;
            }
            return row;
          }

          return query(args);
        },
      },
    },
  })
);
