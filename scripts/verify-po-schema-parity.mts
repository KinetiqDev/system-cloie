/**
 * Fails when the Prisma client's mapped column names disagree with the live
 * database. The PO terminology cutover renamed `cilo_mappings.go_id` to
 * `po_id`; a stale `@map("go_id")` makes every CILOMapping read throw
 * "The column `cilo_mappings.go_id` does not exist in the current database."
 *
 * Run: set -a; . ./.env.local; set +a; pnpm exec tsx scripts/verify-po-schema-parity.mts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const failures: string[] = [];

// Every mapping the Prisma schema declares for the program-outcome layer,
// paired with the physical column the database must expose.
const EXPECTED: ReadonlyArray<{ table: string; column: string }> = [
  { table: "cilo_mappings", column: "po_id" },
  { table: "instrument_template_plo_question_bindings", column: "plo_id" },
  { table: "course_bound_plo_question_bindings", column: "plo_id" },
  { table: "central_deployment_plo_snapshots", column: "plo_id" },
];

const tables = EXPECTED.map((e) => `'${e.table}'`).join(", ");
const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
  `select table_name from information_schema.tables
    where table_schema = 'public'
      and table_name in (${tables})`
);
const present = new Set(rows.map((row) => row.table_name));

for (const { table, column } of EXPECTED) {
  if (!present.has(table)) {
    failures.push(`${table}: table missing`);
    continue;
  }
  const cols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `select column_name from information_schema.columns where table_name = '${table}'`
  );
  if (!cols.some((c) => c.column_name === column)) {
    failures.push(`${table}.${column}: missing (has ${cols.map((c) => c.column_name).join(", ")})`);
  }
}

// The queries from the reported stack frames must actually execute.
// CILOMapping runs first: it is the model whose mapped column is wrong, and
// its Prisma error carries `meta.column`, which names the exact mismatch.
try {
  await prisma.cILOMapping.findMany({ select: { po_id: true, manifestation: true } });
  await prisma.courseBoundCiloQuestionBinding.findMany({
    where: { cilo_id: { not: null } },
    select: { cilo_id: true, cilo_description_snapshot: true },
  });
} catch (error) {
  const prismaError = error as { code?: string; meta?: { modelName?: string; column?: string } };
  const column = prismaError.meta?.column;
  failures.push(
    column
      ? `runtime query failed: ${prismaError.code} on ${prismaError.meta?.modelName} -> missing column ${column}`
      : `runtime query failed: ${String((error as Error).message)
          .replace(/\s+/gu, " ")
          .slice(0, 160)}`
  );
}

await prisma.$disconnect();

if (failures.length > 0) {
  console.error("PO schema parity FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("PO schema parity OK");
