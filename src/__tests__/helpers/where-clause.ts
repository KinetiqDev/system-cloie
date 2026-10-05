/**
 * Minimal Prisma `where`-clause evaluator for unit tests.
 *
 * Program Head evidence ownership now separates General Education
 * course-bound evidence from Program-specific evidence. The security-relevant
 * claim is behavioral: a GE row whose `CourseAssignment.program_id` equals the
 * selected Program must not match the predicates the PH services send to
 * Prisma. Asserting only the query shape would let a refactor satisfy its
 * literal assertions while quietly admitting GE rows, so tests run the captured
 * `where` clause against representative rows with this evaluator.
 *
 * It supports exactly the subset of Prisma filter syntax the scoped PH reads
 * emit (traced at every call site): field equality, `in`, `not`, case-insensitive
 * `contains`, to-one relation filters (`is`), list relation filters
 * (`some`/`none`/`every`), and `AND`/`OR`/`NOT`.
 *
 * Two rules keep the evaluator trustworthy as a test dependency:
 *
 * 1. **Fail closed.** A filter this evaluator does not model never admits a row.
 *    An unmodelled operator is a hole in the boundary, so it must fail the match
 *    loudly instead of silently passing a row the database would have excluded.
 * 2. **Compare the value Prisma compares.** `{ not: "DRAFT" }` is scalar
 *    inequality and `{ not: null }` is `IS NOT NULL`; neither is a nested field
 *    filter. Reading every `not` as a nested filter turned both into no-ops that
 *    admitted the rows the predicate exists to exclude.
 */

type Filter = Record<string, unknown> | undefined | null;
type Row = Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Field-value operators, dispatched from the filter object because an operator
 * may carry modifiers (`mode`) that the matcher needs.
 */
const SCALAR_OPERATORS: Record<
  string,
  (filter: Record<string, unknown>, operand: unknown, actual: unknown) => boolean
> = {
  in: (_filter, operand, actual) =>
    Array.isArray(operand) && operand.some((candidate) => Object.is(candidate, actual)),
  not: (_filter, operand, actual) => {
    if (isPlainObject(operand)) return !matchesScalarFilter(operand, actual);
    // Prisma builds `not` as SQL `NOT (col <op> $1)`, so a NULL column stays
    // unknown rather than becoming true: `{ not: null }` is `IS NOT NULL` and
    // a missing or null value never satisfies it.
    if (actual === null || actual === undefined) return false;
    return !Object.is(actual, operand);
  },
  contains: (filter, operand, actual) => {
    if (typeof actual !== "string" || typeof operand !== "string") return false;
    // `contains` is case-sensitive unless `mode` asks for otherwise.
    const insensitive = filter.mode === "insensitive";
    const haystack = insensitive ? actual.toLowerCase() : actual;
    const needle = insensitive ? operand.toLowerCase() : operand;
    return haystack.includes(needle);
  },
};

/** Filter keys that configure a modelled operator instead of asserting a predicate. */
const SCALAR_MODIFIERS: Record<string, true> = { mode: true };

/**
 * List relation operators. Prisma's vacuous cases follow JavaScript: `every`
 * over no rows is true, `some` is false, `none` is true.
 */
const LIST_OPERATORS: Record<string, (rows: unknown[], clause: unknown) => boolean> = {
  some: (rows, clause) => rows.some((row) => matchesWhere(clause as Filter, row as Row)),
  none: (rows, clause) => !rows.some((row) => matchesWhere(clause as Filter, row as Row)),
  every: (rows, clause) => rows.every((row) => matchesWhere(clause as Filter, row as Row)),
};

/** `AND`/`OR`/`NOT` compose their clauses against the same row. */
const COMBINATORS: Record<string, (clauses: Filter[], row: Row) => boolean> = {
  AND: (clauses, row) => clauses.every((clause) => matchesWhere(clause, row)),
  OR: (clauses, row) => clauses.some((clause) => matchesWhere(clause, row)),
  NOT: (clauses, row) => clauses.every((clause) => !matchesWhere(clause, row)),
};

/**
 * Evaluate one field's filter object (`in`, `not`, `contains`) against a value.
 * Prisma ANDs the operators inside a single filter object, so every modelled
 * operator has to hold. Any other key is an operator this evaluator does not
 * model — an unproven boundary — so the filter fails instead of passing on the
 * operators that happen to be modelled.
 */
function matchesScalarFilter(expected: unknown, actual: unknown): boolean {
  if (!isPlainObject(expected)) return false;

  for (const [operator, operand] of Object.entries(expected)) {
    if (Object.prototype.hasOwnProperty.call(SCALAR_MODIFIERS, operator)) continue;
    if (!Object.prototype.hasOwnProperty.call(SCALAR_OPERATORS, operator)) return false;
    if (!SCALAR_OPERATORS[operator](expected, operand, actual)) return false;
  }
  return isScalarFilter(expected);
}

function isScalarFilter(value: unknown): value is Record<string, unknown> {
  return (
    isPlainObject(value) &&
    Object.keys(value).some((key) => Object.prototype.hasOwnProperty.call(SCALAR_OPERATORS, key))
  );
}

/** Match a single `field: value` entry of a where clause against the row. */
function matchesField(expected: unknown, actual: unknown): boolean {
  if (isScalarFilter(expected)) return matchesScalarFilter(expected, actual);
  if (!isPlainObject(expected)) return Object.is(expected, actual);

  const listOperator = Object.keys(expected).find((key) =>
    Object.prototype.hasOwnProperty.call(LIST_OPERATORS, key)
  );
  if (listOperator !== undefined)
    return Array.isArray(actual) && LIST_OPERATORS[listOperator](actual, expected[listOperator]);

  // Relation filter: `is` addresses the relation explicitly, any other
  // object-valued filter navigates it field by field. A row value that is not
  // an object cannot satisfy either.
  if (!isPlainObject(actual)) return false;
  return matchesWhere(("is" in expected ? expected.is : expected) as Filter, actual);
}

/** Evaluate a Prisma `where` clause against one row. */
export function matchesWhere(where: Filter, row: Row): boolean {
  if (where === undefined || where === null) return true;
  if (!isPlainObject(where)) return false;

  return Object.entries(where).every(([key, expected]) => {
    if (Object.prototype.hasOwnProperty.call(COMBINATORS, key)) {
      const clauses = (Array.isArray(expected) ? expected : [expected]) as Filter[];
      return COMBINATORS[key](clauses, row);
    }
    return matchesField(expected, row[key]);
  });
}

/**
 * Rows out of `rows` that the captured `where` clause would return, standing in
 * for the Prisma query the service issued.
 */
export function selectRows<T extends Row>(where: Filter, rows: readonly T[]): T[] {
  return rows.filter((row) => matchesWhere(where, row));
}
