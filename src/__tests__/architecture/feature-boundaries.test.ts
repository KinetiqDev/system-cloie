/**
 * @vitest-environment node
 *
 * Architecture boundaries for issue #174, enforced over the TypeScript AST.
 *
 * The parent criterion is: *Client Components cannot import Prisma or
 * server-only feature modules*. This suite enforces exactly that, plus the
 * ADR 0011 shared-zone rule that already holds in the repository.
 *
 * Rules:
 * 1. A Client Component must not import the Prisma client, directly or through a
 *    value-import chain: neither the `PrismaClient` value from `@prisma/client`
 *    nor the `@/lib/db/prisma` singleton.
 * 2. A Client Component must not import a feature module whose value-import
 *    chain reaches Prisma or a server-only builtin, and must not import
 *    `next/headers` at all, because that module exists only in the server
 *    runtime.
 * 3. Shared infrastructure under `src/lib` must not import a feature, except the
 *    paths ADR 0011 leaves unrestricted.
 *
 * What the AST sees, which a regex cannot: side-effect imports
 * (`import "@/lib/db/prisma"`), re-exports (`export { x } from`), literal dynamic
 * imports (`await import("@/lib/db/prisma")`), relative specifiers that resolve
 * to the same Prisma module as the alias, directory specifiers that resolve
 * through an `index` barrel, and `import type` edges that are erased and so carry
 * no runtime code.
 *
 * Server-Action boundary: a module whose leading directive is `"use server"`
 * terminates the walk. Next.js compiles its exports into RPC references, so a
 * Client Component importing one receives a client-side proxy rather than the
 * module body. That is what keeps the legitimate action-calling components out of
 * this check's failure set. The directive is read only from the leading position;
 * a mention inside a comment or body does not count.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");

/** The only sanctioned Prisma entry point in application code. */
const PRISMA_MODULE = "src/lib/db/prisma";

/**
 * Server-only builtins. Reaching one of these from a Client Component means server
 * code is in the browser bundle. `node:crypto` is the real hazard in this repo:
 * 29 modules use it for session signing, HMAC, and secret handling.
 */
const SERVER_ONLY_BUILTINS = [
  "node:crypto",
  "node:fs",
  "node:fs/promises",
  "node:child_process",
  "node:net",
  "node:tls",
  "node:dns",
  "node:worker_threads",
] as const;

/**
 * Specifiers that mark a module as server-only, so a Client Component reaching
 * one is a bundle leak regardless of what the module does internally.
 *
 * `next/headers` is here because it publishes the request-scoped `cookies()` and
 * `headers()` APIs, which exist only in the server runtime.
 *
 * The `server-only` marker itself is recognized even though this repository does
 * not currently use it: the checker should reject a client import the moment
 * anyone adopts the convention. Applying the marker across existing feature
 * services is deliberately not done here, because the package is not a resolvable
 * top-level dependency in this repository (Next vendors a copy, but Vitest's
 * `node` project resolves bare specifiers through `node_modules`, so adding the
 * marker to a service under test fails those tests). Server ownership today holds
 * by import graph, which this suite enforces directly.
 */
const SERVER_ONLY_MARKERS = [
  "server-only",
  "next/headers",
  "@/lib/db/prisma",
  PRISMA_MODULE,
] as const;

/** The package that publishes the Prisma client constructor. */
const PRISMA_CLIENT_PACKAGE = "@prisma/client";

/** The one `@prisma/client` value a Client Component must never bind. */
const PRISMA_CLIENT_VALUE_BINDING = "PrismaClient";

/** Resolved from `tsconfig.json` `compilerOptions.paths`. */
const PATH_ALIASES: ReadonlyArray<{ prefix: string; target: string }> = [
  { prefix: "@/", target: "src/" },
];

/** Documented exceptions. Keep empty; each entry needs the reason it is safe. */
const CLIENT_IMPORT_ALLOWLIST: ReadonlyArray<{ from: string; to: string; reason: string }> = [];

/** `src/lib` modules permitted to import a feature outside the unrestricted paths. */
const SHARED_IMPORT_ALLOWLIST: ReadonlyArray<{ from: string; to: string; reason: string }> = [];

/**
 * `src/lib` paths ADR 0011 leaves unrestricted rather than forbidding:
 * `server-actions` owns `src/lib/actions/**`, and `src/lib/supabase/**` composes
 * the auth client, which must reach feature services.
 */
const SHARED_UNRESTRICTED_PREFIXES = ["src/lib/actions/", "src/lib/supabase/"] as const;

/** Every `.ts`/`.tsx` file under `src`, excluded tests and declarations. */
function collectSourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(path.join(PROJECT_ROOT, directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      found.push(...collectSourceFiles(relative));
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (relative.includes("__tests__") || relative.endsWith(".d.ts")) continue;
    found.push(relative);
  }
  return found;
}

const sourceFiles = collectSourceFiles("src");

/** Source path without extension, used as the canonical module key. */
function moduleKey(file: string): string {
  return file.replace(/\.(tsx?|jsx?)$/, "");
}

const modulePaths = new Set(sourceFiles.map(moduleKey));
const sourceCache = new Map<string, ts.SourceFile | null>();

function sourceOf(modulePath: string): ts.SourceFile | null {
  const cached = sourceCache.get(modulePath);
  if (cached !== undefined) return cached;

  let result: ts.SourceFile | null = null;
  for (const extension of [".ts", ".tsx"]) {
    const absolute = path.join(PROJECT_ROOT, `${modulePath}${extension}`);
    if (!existsSync(absolute)) continue;
    result = ts.createSourceFile(
      absolute,
      readFileSync(absolute, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      extension === ".tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    break;
  }
  sourceCache.set(modulePath, result);
  return result;
}

/** The leading directive of a module, ignoring comments. */
function leadingDirective(sourceFile: ts.SourceFile): string | null {
  for (const statement of sourceFile.statements) {
    if (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression)) {
      return statement.expression.text;
    }
    // Comments are not statements, so the first real statement ends the search.
    return null;
  }
  return null;
}

function isClientModule(modulePath: string): boolean {
  const source = sourceOf(modulePath);
  return source !== null && leadingDirective(source) === "use client";
}

function isServerActionModule(modulePath: string): boolean {
  const source = sourceOf(modulePath);
  return source !== null && leadingDirective(source) === "use server";
}

/**
 * Resolve a candidate module key to itself, or to its `index` barrel when the
 * specifier names a directory. A directory import is how `@/features/legal`
 * reaches `src/features/legal/index.ts`, so barrel re-exports must be followed.
 */
function withIndexFallback(candidate: string): string {
  if (modulePaths.has(candidate)) return candidate;
  return modulePaths.has(`${candidate}/index`) ? `${candidate}/index` : candidate;
}

/** Resolve a specifier to a project module key, or null when it is external. */
function resolveSpecifier(fromModule: string, specifier: string): string | null {
  for (const alias of PATH_ALIASES) {
    if (specifier.startsWith(alias.prefix)) {
      return withIndexFallback(`${alias.target}${specifier.slice(alias.prefix.length)}`);
    }
  }
  if (!specifier.startsWith(".")) return null;

  const segments = fromModule.split("/").slice(0, -1);
  for (const part of specifier.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }

  return withIndexFallback(segments.join("/"));
}

type ModuleEdge = {
  /** Import specifier as written. */
  specifier: string;
  /** Resolved project module key, or null when external. */
  resolved: string | null;
  /** True when the edge is erased at compile time. */
  typeOnly: boolean;
  /**
   * Named bindings the edge imports, or null when the edge binds no names
   * (side-effect import, `export *`, or a dynamic import). Used to check that a
   * cross-feature import takes the documented interface rather than reaching for
   * whatever else the target happens to export.
   */
  bindings: string[] | null;
};

/**
 * True when a named binding list carries no value across the edge: every element
 * is an inline `type` specifier (or the list is empty).
 *
 * This is the same erasure rule as a whole-statement `import type` / `export type`,
 * applied per element, so `export { type Shape } from "..."` and
 * `import { run, type Shape }` are judged by the specifiers that survive.
 *
 * A namespace clause (`import * as ns`, `export * as ns from`) is always a value,
 * and `undefined` is a side-effect import, which carries runtime code by design.
 */
function bindingsAreTypeOnly(
  bindings: ts.NamedImportBindings | ts.NamedExportBindings | undefined
): boolean {
  if (bindings === undefined) return false;
  if (!ts.isNamedImports(bindings) && !ts.isNamedExports(bindings)) return false;
  return bindings.elements.every((element) => element.isTypeOnly);
}

/**
 * The value names an import declaration binds, or null when it binds none.
 *
 * The name is the *imported* one (the `propertyName`), not the local alias: a
 * seam pins what a consumer may take from the target module, so
 * `import { internalName as publicName }` still reaches `internalName` in the
 * target and must be checked as such. Without this, any consumer could defeat
 * the seam rule by renaming the binding it imports.
 *
 * Inline `type` specifiers (`import { run, type Shape }`) are skipped: they are
 * erased at compile time, exactly like a whole-statement `import type`, so they
 * cannot widen runtime coupling and must not be held to a seam's binding list.
 */
function importedNames(clause: ts.ImportClause | undefined): string[] | null {
  if (clause === undefined) return null;
  if (clause.name !== undefined) return null;

  const named = clause.namedBindings;
  if (named !== undefined && ts.isNamedImports(named)) {
    return named.elements
      .filter((element) => !element.isTypeOnly)
      .map((element) => (element.propertyName ?? element.name).text);
  }
  // A default or namespace binding is not a named interface, so treat the edge
  // as unbounded rather than guessing which export it will reach.
  return null;
}

/** The literal specifier on a static import, or null. */
function staticImportSpecifier(node: ts.Node): string | null {
  if (!ts.isImportDeclaration(node)) return null;
  return ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : null;
}

/** The literal specifier on a re-export, or null. */
function reExportSpecifier(node: ts.Node): string | null {
  if (!ts.isExportDeclaration(node)) return null;
  const specifier = node.moduleSpecifier;
  if (specifier === undefined || !ts.isStringLiteral(specifier)) return null;
  return specifier.text;
}

/**
 * The value names an `export ... from` declaration republishes, or null when it
 * republishes none.
 *
 * Mirrors `importedNames`: the name is the *exported* one (`propertyName`), so a
 * renamed re-export is judged by what it takes from the target, not by the local
 * name it publishes. `export * from` names nothing specific, so it stays
 * unbounded like a namespace import.
 */
function reExportedNames(exportClause: ts.NamedExportBindings | undefined): string[] | null {
  if (exportClause === undefined || !ts.isNamedExports(exportClause)) return null;
  return exportClause.elements
    .filter((element) => !element.isTypeOnly)
    .map((element) => (element.propertyName ?? element.name).text);
}

/** The literal specifier on a dynamic `import("@/lib/db/prisma")` call, or null. */
function dynamicImportSpecifier(node: ts.Node): string | null {
  if (!ts.isCallExpression(node)) return null;
  if (node.expression.kind !== ts.SyntaxKind.ImportKeyword) return null;
  const [argument] = node.arguments;
  return argument !== undefined && ts.isStringLiteral(argument) ? argument.text : null;
}

/** The specifier a node imports or re-exports, or null when the node is neither. */
function specifierOf(node: ts.Node): string | null {
  return staticImportSpecifier(node) ?? reExportSpecifier(node) ?? dynamicImportSpecifier(node);
}

/** The import declaration's clause, when the node is one. */
function importClauseOf(node: ts.Node): ts.ImportClause | undefined {
  return ts.isImportDeclaration(node) ? node.importClause : undefined;
}

/** True when the whole edge is erased, so it cannot carry runtime code. */
function edgeIsTypeOnly(node: ts.Node, clause: ts.ImportClause | undefined): boolean {
  if (ts.isExportDeclaration(node)) {
    return Boolean(node.isTypeOnly) || bindingsAreTypeOnly(node.exportClause);
  }
  if (clause === undefined) return false;
  return Boolean(clause.isTypeOnly) || bindingsAreTypeOnly(clause.namedBindings);
}

/**
 * Every value-carrying edge out of a module: static imports, re-exports,
 * side-effect imports, and literal dynamic imports. Type-only edges are returned
 * flagged rather than dropped, so a caller can report them distinctly.
 */
function readEdges(modulePath: string): ModuleEdge[] {
  const source = sourceOf(modulePath);
  if (source === null) return [];

  const edges: ModuleEdge[] = [];
  const record = (specifier: string, typeOnly: boolean, bindings: string[] | null) => {
    edges.push({
      specifier,
      resolved: resolveSpecifier(modulePath, specifier),
      typeOnly,
      bindings,
    });
  };

  const visit = (node: ts.Node) => {
    const specifier = specifierOf(node);
    if (specifier !== null) {
      const clause = importClauseOf(node);
      const bindings = ts.isExportDeclaration(node)
        ? reExportedNames(node.exportClause)
        : importedNames(clause);
      record(specifier, edgeIsTypeOnly(node, clause), bindings);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  return edges;
}

/**
 * Every edge a Client Component could actually pull runtime code across.
 *
 * A `"use server"` module is the terminal boundary described in the file header:
 * Next.js compiles its exports into RPC references, so its own imports never
 * reach the browser. That holds however the module is reached — as the entry
 * (`return []`) and as a target (filtered), so a client that reaches an action
 * through one middle module still stops there.
 */
function valueTargets(modulePath: string): string[] {
  if (isServerActionModule(modulePath)) return [];
  return readEdges(modulePath)
    .filter((edge) => !edge.typeOnly && edge.resolved !== null && modulePaths.has(edge.resolved))
    .map((edge) => edge.resolved as string)
    .filter((target) => !isServerActionModule(target));
}

type Reachability = { via: string; specifier: string | null };

/**
 * Walk value imports from `entryModule` and report the first module that imports
 * the Prisma client, the server-only marker, or a server-only builtin.
 */
function serverEvidenceReachedFrom(entryModule: string): Reachability | null {
  if (isServerActionModule(entryModule)) return null;

  const visited = new Set<string>();
  const pending: Array<{ modulePath: string; specifier: string | null }> = [
    { modulePath: entryModule, specifier: null },
  ];

  while (pending.length > 0) {
    const current = pending.pop() as { modulePath: string; specifier: string | null };
    if (visited.has(current.modulePath)) continue;
    visited.add(current.modulePath);

    for (const edge of readEdges(current.modulePath)) {
      if (edge.typeOnly) continue;
      if (isServerOnlySpecifier(edge)) {
        return { via: current.modulePath, specifier: edge.specifier };
      }
    }

    for (const target of valueTargets(current.modulePath)) {
      pending.push({ modulePath: target, specifier: current.specifier });
    }
  }

  return null;
}

const clientModules = sourceFiles.map(moduleKey).filter(isClientModule);

/** A short description of what one module reaches, or null when it is clean. */
function serverReachDescription(modulePath: string): string | null {
  if (!modulePaths.has(modulePath)) return null;
  const reached = serverEvidenceReachedFrom(modulePath);
  if (reached === null) return null;
  return `${reached.specifier ?? PRISMA_MODULE} via ${reached.via}`;
}

/** True when the allowlist excuses this edge, by specifier or by resolved path. */
function edgeIsAllowed(entryModule: string, edge: ModuleEdge): boolean {
  if (isAllowed(CLIENT_IMPORT_ALLOWLIST, entryModule, edge.specifier)) return true;
  return edge.resolved !== null && isAllowed(CLIENT_IMPORT_ALLOWLIST, entryModule, edge.resolved);
}

function edgeViolation(entryModule: string, edge: ModuleEdge): string | null {
  if (edge.typeOnly || edgeIsAllowed(entryModule, edge)) return null;

  if (isServerOnlySpecifier(edge)) return `${entryModule} -> ${edge.specifier}`;

  const reached = edge.resolved === null ? null : serverReachDescription(edge.resolved);
  if (reached === null) return null;
  return `${entryModule} -> ${edge.specifier} (reaches ${reached})`;
}

function clientOffenders(): string[] {
  const offenders: string[] = [];
  for (const clientModule of clientModules) {
    for (const edge of readEdges(clientModule)) {
      const violation = edgeViolation(clientModule, edge);
      if (violation !== null) offenders.push(violation);
    }
  }
  return offenders;
}

/**
 * True when the edge names the Prisma singleton, the Prisma client constructor,
 * `next/headers`, a server-only marker package, or a Node builtin that cannot run
 * in a browser.
 *
 * `@prisma/client` is a package, not a marker: it also publishes enums and types
 * that Client Components legitimately use (`CourseScope`, `YearLevel`, and the
 * `Prisma` namespace for query types). Named value imports are checked for the
 * `PrismaClient` constructor. Namespace, default, side-effect, and dynamic
 * imports expose an unbounded value set and cannot prove the constructor absent.
 *
 * An erased edge is never server evidence: `import type { PrismaClient }` and
 * `import { type Shape }` leave no runtime code behind.
 */
function isServerOnlySpecifier(edge: ModuleEdge): boolean {
  if (edge.typeOnly) return false;
  if ((SERVER_ONLY_MARKERS as readonly string[]).includes(edge.specifier)) return true;
  if (edge.resolved === PRISMA_MODULE) return true;
  if (edge.specifier === PRISMA_CLIENT_PACKAGE) {
    return edge.bindings === null || edge.bindings.includes(PRISMA_CLIENT_VALUE_BINDING);
  }
  return (SERVER_ONLY_BUILTINS as readonly string[]).includes(edge.specifier);
}

function isAllowed(
  allowlist: ReadonlyArray<{ from: string; to: string }>,
  from: string,
  to: string
): boolean {
  return allowlist.some((entry) => entry.from === from && entry.to === to);
}

function sharedOffenders(): string[] {
  const offenders: string[] = [];
  const sharedModules = [...modulePaths]
    .filter((modulePath) => modulePath.startsWith("src/lib/"))
    .filter(
      (modulePath) => !SHARED_UNRESTRICTED_PREFIXES.some((prefix) => modulePath.startsWith(prefix))
    );

  for (const modulePath of sharedModules) {
    for (const edge of readEdges(modulePath)) {
      if (edge.typeOnly) continue;
      if (edge.resolved === null) continue;
      if (!edge.resolved.startsWith("src/features/")) continue;
      if (isAllowed(SHARED_IMPORT_ALLOWLIST, modulePath, edge.resolved)) continue;
      offenders.push(`${modulePath} -> ${edge.specifier}`);
    }
  }
  return offenders;
}

/**
 * Documented cross-feature interfaces (issue #174).
 *
 * This registry records a small, deliberately selected set of cross-feature
 * seams, not an exhaustive inventory of every import between features. A seam is
 * named here only when a caller outside the owning feature depends on a module
 * that owns a shared contract; the rule then pins the *exact* imported names, so
 * a consumer cannot quietly widen its use of another feature's internals, and the
 * owning feature cannot rename or drop a documented export without this test
 * failing. The same three seams are described for readers in
 * `docs/architecture/overview.md`.
 *
 * Deliberately NOT registered, with reasons:
 *
 * - `auth/services/resolve-auth-session` and `resolve-program-head-context`. These
 *   are the session and role-scoping primitives consumed across routes, Server
 *   Actions, and most features. A per-consumer interface here would be a second
 *   convention beside the established one, and a boundary rule would forbid
 *   nearly every server read. They are approved direct composition.
 * - `src/lib/actions/**`. ADR 0011 classifies that path as its own
 *   `server-actions` zone, and feature composition there is sanctioned: an action
 *   is the RPC boundary a Client Component calls, so it must reach the feature
 *   service that owns the operation. Approved direct composition, and the shared
 *   rule above exempts the path.
 * - Single-consumer edges into a module that owns only a private query (for
 *   example `analytics -> academic-structure`, `course-assignments -> analytics`).
 *   Naming one would freeze a private query as public before a second caller
 *   needs it. Consumer count is not the test: a seam qualifies by owning a shared
 *   contract, so a module may be registered while serving only one consumer. The
 *   canonical analytics aggregators are consumed by `response-review` alone,
 *   because a review surface that re-derived that arithmetic could disagree with
 *   the analytics it reviews.
 */
const DOCUMENTED_CROSS_FEATURE_SEAMS: ReadonlyArray<{
  /** Owning feature and module that publishes the interface. */
  module: string;
  /** Feature that consumes it. */
  consumer: string;
  /** Exact bindings consumers may import; widening this list is a review decision. */
  bindings: readonly string[];
  /** Why this is an interface rather than private composition. */
  reason: string;
}> = [
  {
    module: "src/features/course-assignments/services/course-assignment-roster",
    consumer: "responses",
    bindings: [
      "resolveCourseBoundEvaluationEligibility",
      "resolveCourseBoundEvaluationEligibilities",
      "toCourseBoundEvaluationEligibilityAssignment",
    ],
    reason:
      "Roster membership is the authoritative source of Course-bound evaluation eligibility (ADR 0007): recipients follow the managed roster, never an inference from the term-placement ledger. Responses must ask the owning feature rather than re-derive it, because a second derivation is how eligibility drifts from the roster. The interface is a read: it resolves eligibility and projects the assignment shape, and publishes no write.",
  },
  {
    module: "src/features/course-assignments/services/course-assignment-roster",
    consumer: "analytics",
    bindings: ["countEligibleCourseBoundEvaluationAssignments"],
    reason:
      "Faculty analytics reports how many reported evaluation opportunities came from students who are currently roster-eligible, so it counts through the same seam rather than re-deriving eligibility from the roster tables. The Analytics CONTEXT states that response rate uses historical EvaluationAssignment opportunities while eligibility is dynamic, and this read is exactly that split: it counts assignments, filtered by the caller's scope, without deciding what an opportunity is.",
  },
  {
    module: "src/features/analytics/aggregators",
    consumer: "response-review",
    bindings: [
      // Metric builders
      "buildCiloMetrics",
      "buildQuestionMetrics",
      "buildParticipationSummary",
      "buildProgramWideGoMetrics",
      "groupRatingsByScale",
      // Scale identity
      "resolveItemScaleIdentity",
      "describeScale",
      // Metric vocabulary
      "CiloGoMapping",
      "CiloMetric",
      "GoMetric",
      "MetricEvidenceSummary",
      "ParticipationSummary",
      "QuestionMetric",
      "OutcomeItemRatingRow",
    ],
    reason:
      "The Program Head review surfaces report the same canonical CILO, question, participation, and scale arithmetic as Analytics. Forking that arithmetic would let the review display disagree with the analytics it reviews, so review reads the canonical builders instead. The aggregators are pure: they take rating rows and return metrics, so the contract is the metric vocabulary rather than a query. Scale identity is part of it because a review row must separate incompatible scales the same way analytics does.",
  },
];

/** Directory prefixes treated as one module for the aggregator seam above. */
const AGGREGATOR_SEAM_PREFIX = "src/features/analytics/aggregators/";

/** The feature that owns a module path, or null when it is not inside a feature. */
function featureOf(modulePath: string): string | null {
  return /^src\/features\/([^/]+)\//.exec(modulePath)?.[1] ?? null;
}

/** True when a module path belongs to a documented seam. */
function moduleIsInSeam(
  modulePath: string,
  seam: (typeof DOCUMENTED_CROSS_FEATURE_SEAMS)[number]
): boolean {
  // The aggregator seam covers a directory, so every module under it is in scope.
  // Any other seam names exactly one module.
  return seam.module.endsWith("/aggregators")
    ? modulePath.startsWith(AGGREGATOR_SEAM_PREFIX)
    : modulePath === seam.module;
}

/**
 * The documented seam a (consumer feature, module) pair belongs to, or undefined.
 *
 * Matching includes the consumer because one module can publish to more than one
 * feature with a different binding set: the roster seam serves Responses with the
 * eligibility resolvers and Analytics with the eligibility count.
 */
function seamFor(
  consumerFeature: string,
  modulePath: string
): (typeof DOCUMENTED_CROSS_FEATURE_SEAMS)[number] | undefined {
  return DOCUMENTED_CROSS_FEATURE_SEAMS.find(
    (seam) => seam.consumer === consumerFeature && moduleIsInSeam(modulePath, seam)
  );
}

/** The violation one cross-feature edge represents inside a seam, or null. */
function seamViolation(
  consumerFeature: string,
  modulePath: string,
  edge: ModuleEdge
): string | null {
  // A type-only import is erased, so it cannot widen runtime coupling.
  if (edge.typeOnly || edge.resolved === null) return null;

  const allowed = seamFor(consumerFeature, edge.resolved)?.bindings ?? [];
  if (edge.bindings === null) {
    return `${modulePath} -> ${edge.specifier} (unnamed import from a documented seam)`;
  }

  const undeclared = edge.bindings.filter((name) => !allowed.includes(name));
  if (undeclared.length === 0) return null;
  return `${modulePath} -> ${edge.specifier} (undeclared: ${undeclared.join(", ")})`;
}

/**
 * Cross-feature imports that reach a documented module without taking its
 * documented interface: an undeclared binding, or any binding at all when the
 * target publishes a seam.
 */
/** The seam violations in one module, or an empty list. */
function moduleSeamViolations(modulePath: string, fromFeature: string): string[] {
  return readEdges(modulePath).flatMap((edge) => {
    if (edge.resolved === null) return [];
    const toFeature = featureOf(edge.resolved);
    if (toFeature === null || toFeature === fromFeature) return [];
    if (seamFor(fromFeature, edge.resolved) === undefined) return [];
    const violation = seamViolation(fromFeature, modulePath, edge);
    return violation === null ? [] : [violation];
  });
}

function undocumentedSeamUse(): string[] {
  return [...modulePaths].flatMap((modulePath) => {
    const fromFeature = featureOf(modulePath);
    return fromFeature === null ? [] : moduleSeamViolations(modulePath, fromFeature);
  });
}

/**
 * The names one exported declaration contributes.
 *
 * A variable statement contributes one name per declarator; every other
 * statement that can be exported contributes the single name TypeScript reports
 * for it. Statements that cannot carry a name contribute nothing.
 */
function declarationNames(statement: ts.Statement): string[] {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) =>
      ts.isIdentifier(declaration.name) ? [declaration.name.text] : []
    );
  }
  if (!isNamableStatement(statement)) return [];

  const name = ts.getNameOfDeclaration(statement);
  return name !== undefined && ts.isIdentifier(name) ? [name.text] : [];
}

/** True when a statement node is one TypeScript can report a declaration name for. */
function isNamableStatement(statement: ts.Statement): statement is ts.DeclarationStatement {
  return (
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isEnumDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement)
  );
}

/** True when a declaration carries the `export` keyword. */
function isExportedDeclaration(statement: ts.Statement): boolean {
  const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
  return Boolean(modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

/** The names a module exports, read from its declarations. */
function exportedNames(modulePath: string): Set<string> {
  const source = sourceOf(modulePath);
  if (source === null) return new Set();

  return new Set(
    source.statements
      .filter(isExportedDeclaration)
      .flatMap((statement) => declarationNames(statement))
  );
}

/** Every module a seam covers: one directory for the aggregators, else one file. */
function seamTargets(seam: (typeof DOCUMENTED_CROSS_FEATURE_SEAMS)[number]): string[] {
  return seam.module === "src/features/analytics/aggregators"
    ? [...modulePaths].filter((candidate) => candidate.startsWith(AGGREGATOR_SEAM_PREFIX))
    : [seam.module];
}

describe("documented cross-feature interfaces (#174)", () => {
  it("keeps cross-feature imports inside the documented bindings", () => {
    expect(undocumentedSeamUse()).toEqual([]);
  });

  it("publishes the documented seam from its owning feature", () => {
    // A renamed or deleted export would silently move the boundary; this pins it.
    for (const seam of DOCUMENTED_CROSS_FEATURE_SEAMS) {
      const exported = new Set(seamTargets(seam).flatMap((target) => [...exportedNames(target)]));
      for (const binding of seam.bindings) {
        expect(exported.has(binding), `${seam.module} must export ${binding}`).toBe(true);
      }
    }
  });

  it("records a reason and a consumer feature for every seam", () => {
    for (const seam of DOCUMENTED_CROSS_FEATURE_SEAMS) {
      expect(seam.reason.length).toBeGreaterThan(80);
      expect(featureOf(seam.module)).not.toBeNull();
      expect(modulePaths.has(seam.module) || seam.module.endsWith("/aggregators")).toBe(true);
    }
  });
});

describe("feature import boundaries (#174)", () => {
  it("keeps Client Components away from Prisma and server-only modules", () => {
    expect(clientOffenders()).toEqual([]);
  });

  it("keeps shared infrastructure independent of features, except the unrestricted paths", () => {
    expect(sharedOffenders()).toEqual([]);
  });
});

/**
 * The cases below exercise the checker itself. They assert behavior on synthetic
 * modules rather than naming current repository files, so the suite keeps its
 * meaning as the codebase moves.
 */
describe("boundary checker behavior", () => {
  function parseFixture(relativePath: string, code: string): ts.SourceFile {
    return ts.createSourceFile(
      relativePath,
      code,
      ts.ScriptTarget.Latest,
      true,
      relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
  }

  function edgesOf(relativePath: string, code: string): ModuleEdge[] {
    sourceCache.set(relativePath, parseFixture(relativePath, code));
    const edges = readEdges(relativePath);
    sourceCache.delete(relativePath);
    return edges;
  }

  it("sees side-effect imports, re-exports, and literal dynamic imports", () => {
    const edges = edgesOf(
      "src/features/probe/module",
      [
        'import "@/lib/db/prisma";',
        'export { something } from "@/lib/db/prisma";',
        'export * from "./other";',
        'const lazy = await import("@/lib/db/prisma");',
        'import type { Prisma } from "@prisma/client";',
        "",
      ].join("\n")
    );

    const specifiers = edges.map((edge) => `${edge.specifier}${edge.typeOnly ? " [type]" : ""}`);
    expect(specifiers).toEqual([
      "@/lib/db/prisma",
      "@/lib/db/prisma",
      "./other",
      "@/lib/db/prisma",
      "@prisma/client [type]",
    ]);
  });

  it("does not mistake a relative specifier for the alias form of a server module", () => {
    // A client module reaching Prisma by relative path must be caught even though
    // the specifier never matches the `@/` alias.
    expect(edgesOf("src/lib/db/prisma", "export const prisma = 1;")).toEqual([]);
    const edges = edgesOf(
      "src/features/probe/client",
      'import { prisma } from "../../lib/db/prisma";'
    );
    expect(edges[0]?.resolved).toBe("src/lib/db/prisma");
  });

  it("reads the leading directive only, so a body-level use server does not stop the walk", () => {
    const leading = parseFixture("src/features/probe/a.ts", '"use server";\nexport const x = 1;\n');
    expect(leadingDirective(leading)).toBe("use server");

    const trailing = parseFixture(
      "src/features/probe/b.ts",
      'import { prisma } from "@/lib/db/prisma";\nvoid "use server";\nexport const x = 1;\n'
    );
    expect(leadingDirective(trailing)).toBe(null);

    const commented = parseFixture(
      "src/features/probe/c.ts",
      '// "use server" is not a directive here\nexport const x = 1;\n'
    );
    expect(leadingDirective(commented)).toBe(null);
  });

  it("resolves a directory specifier through its index barrel, for both alias and relative forms", () => {
    modulePaths.add("src/features/probe/barrel/index");
    try {
      expect(
        edgesOf("src/features/probe/client", 'export { x } from "./barrel";')[0]?.resolved
      ).toBe("src/features/probe/barrel/index");
      expect(
        edgesOf("src/features/probe/client", 'export { x } from "@/features/probe/barrel";')[0]
          ?.resolved
      ).toBe("src/features/probe/barrel/index");
    } finally {
      modulePaths.delete("src/features/probe/barrel/index");
    }
  });

  it("treats the server-only marker and server-only builtins as leaks, but not arbitrary packages", () => {
    const edges = edgesOf(
      "src/features/probe/client",
      [
        'import "server-only";',
        'import { createHmac } from "node:crypto";',
        'import { z } from "zod";',
      ].join("\n")
    );
    expect(edges.map(isServerOnlySpecifier)).toEqual([true, true, false]);
  });

  it("skips type-only edges when walking, so an erased import cannot fail a client", () => {
    sourceCache.set(
      "src/features/probe/type-only-client",
      parseFixture(
        "src/features/probe/type-only-client",
        [
          '"use client";',
          'import type { Shape } from "@/lib/db/prisma";',
          'export type { Prisma } from "@prisma/client";',
          'export { type Provider } from "@/lib/db/prisma";',
          "export const view = (input: Shape) => input;",
        ].join("\n")
      )
    );
    try {
      // `import type`, `export type`, and an inline `type` specifier are all
      // erased, so none of them is a value edge a browser could follow.
      expect(valueTargets("src/features/probe/type-only-client")).toEqual([]);
      expect(serverEvidenceReachedFrom("src/features/probe/type-only-client")).toBe(null);
      expect(readEdges("src/features/probe/type-only-client").map((edge) => edge.typeOnly)).toEqual(
        [true, true, true]
      );
    } finally {
      sourceCache.delete("src/features/probe/type-only-client");
    }
  });

  it("judges a seam import by the name it takes, so an alias cannot smuggle a private export", () => {
    // The seam pins what a consumer may reach in the owning module, so aliasing
    // is judged by the exported name, never by the local one. Otherwise
    // `private as documented` would read as an allowed binding while pulling the
    // private export, and a legitimate rename of a documented binding would read
    // as a violation.
    const seamSpecifier = "@/features/course-assignments/services/course-assignment-roster";
    const consumer = "src/features/responses/services/probe-seam-consumer";
    const violationsFor = (code: string) => {
      sourceCache.set(consumer, parseFixture(consumer, code));
      try {
        return moduleSeamViolations(consumer, "responses");
      } finally {
        sourceCache.delete(consumer);
      }
    };

    expect(
      violationsFor(
        [
          `import { resolveAuthorizedCourseAssignmentRoster as toCourseBoundEvaluationEligibilityAssignment } from "${seamSpecifier}";`,
          "void toCourseBoundEvaluationEligibilityAssignment;",
          "",
        ].join("\n")
      )
    ).toEqual([
      `${consumer} -> ${seamSpecifier} (undeclared: resolveAuthorizedCourseAssignmentRoster)`,
    ]);

    // A renamed re-export takes the same route out of the seam.
    expect(
      violationsFor(
        `export { resolveAuthorizedCourseAssignmentRoster as resolveCourseBoundEvaluationEligibility } from "${seamSpecifier}";\n`
      )
    ).toEqual([
      `${consumer} -> ${seamSpecifier} (undeclared: resolveAuthorizedCourseAssignmentRoster)`,
    ]);

    // Renaming a documented binding stays legal, and an erased specifier is not a
    // seam question at all.
    expect(
      violationsFor(
        [
          `import { toCourseBoundEvaluationEligibilityAssignment as projectEligibility } from "${seamSpecifier}";`,
          `import { type CourseBoundEvaluationEligibilityInput as EligibilityInput } from "${seamSpecifier}";`,
          "export type Probe = EligibilityInput;",
          "void projectEligibility;",
          "",
        ].join("\n")
      )
    ).toEqual([]);
  });

  it("catches the Prisma client constructor without rejecting the enums and types Clients use", () => {
    const leak = edgesOf(
      "src/features/probe/client",
      [
        'import { PrismaClient } from "@prisma/client";',
        'import { PrismaClient as Database } from "@prisma/client";',
      ].join("\n")
    );
    expect(leak.map(isServerOnlySpecifier)).toEqual([true, true]);
    const unbounded = edgesOf(
      "src/features/probe/client",
      [
        'import * as Prisma from "@prisma/client";',
        'import Prisma from "@prisma/client";',
        'import "@prisma/client";',
        'void import("@prisma/client");',
        'import Prisma, { CourseScope } from "@prisma/client";',
      ].join("\n")
    );
    expect(unbounded.map(isServerOnlySpecifier)).toEqual([true, true, true, true, true]);

    const legal = edgesOf(
      "src/features/probe/client",
      [
        'import { CourseScope } from "@prisma/client";',
        'import type { PrismaClient, Prisma } from "@prisma/client";',
        'import { CourseScope, type Prisma } from "@prisma/client";',
        'import { z } from "zod";',
      ].join("\n")
    );
    expect(legal.map(isServerOnlySpecifier)).toEqual([false, false, false, false]);
  });

  it("catches a direct or transitive next/headers import but leaves next/navigation alone", () => {
    const direct = edgesOf(
      "src/features/probe/client",
      [
        'import { cookies } from "next/headers";',
        'import { useRouter } from "next/navigation";',
      ].join("\n")
    );
    expect(direct.map(isServerOnlySpecifier)).toEqual([true, false]);

    // The client reaches `next/headers` only through a middle module: the walk
    // must follow the value edge and report the transitive leak.
    const files: Array<[string, string]> = [
      [
        "src/features/probe/headers-client",
        ['"use client";', 'import { label } from "@/features/probe/headers-middle";'].join("\n"),
      ],
      [
        "src/features/probe/headers-middle",
        ['import { cookies } from "next/headers";', "export const label = cookies;"].join("\n"),
      ],
    ];
    for (const [modulePath, code] of files) {
      // `valueTargets` only crosses edges into known project modules, so the
      // synthetic pair has to be registered the way a real file would be.
      modulePaths.add(modulePath);
      sourceCache.set(modulePath, parseFixture(modulePath, code));
    }
    try {
      const reached = serverEvidenceReachedFrom("src/features/probe/headers-client");
      expect(reached?.specifier).toBe("next/headers");
      expect(reached?.via).toBe("src/features/probe/headers-middle");
    } finally {
      for (const [modulePath] of files) {
        modulePaths.delete(modulePath);
        sourceCache.delete(modulePath);
      }
    }
  });

  it("treats a use server module as terminal even when reached through a middle module", () => {
    const files: Array<[string, string]> = [
      [
        "src/features/probe/action-client",
        ['"use client";', 'import { run } from "@/features/probe/action-middle";'].join("\n"),
      ],
      [
        "src/features/probe/action-middle",
        [
          'import { runSomething } from "@/features/probe/action-module";',
          "export const run = runSomething;",
        ].join("\n"),
      ],
      [
        "src/features/probe/action-module",
        [
          '"use server";',
          'import { prisma } from "@/lib/db/prisma";',
          "export async function runSomething() {",
          "  return prisma;",
          "}",
        ].join("\n"),
      ],
    ];
    for (const [modulePath, code] of files) {
      modulePaths.add(modulePath);
      sourceCache.set(modulePath, parseFixture(modulePath, code));
    }
    try {
      // The middle module is still inspected, but the action terminates the walk
      // before Prisma is reached, exactly as the file header describes.
      expect(serverEvidenceReachedFrom("src/features/probe/action-client")).toBe(null);
    } finally {
      for (const [modulePath] of files) {
        modulePaths.delete(modulePath);
        sourceCache.delete(modulePath);
      }
    }
  });
});
