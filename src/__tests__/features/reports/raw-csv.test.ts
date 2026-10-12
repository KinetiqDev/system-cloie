import { describe, expect, it } from "vitest";
import {
  buildRawQuantitativeCsv,
  RAW_CSV_HEADERS,
} from "@/features/reports/services/build-raw-csv";
import type { ReportEvidence } from "@/features/reports/types";
import { GROUP_IT101_MORNING, reportEvidenceFixture } from "./report-fixture";

// ---------------------------------------------------------------------------
// Raw quantitative CSV
//
// The generated file is parsed back and checked field by field: row grain,
// headers, ordering, escaping, formula neutralization, source separation, and
// the identifiers the export must never carry.
// ---------------------------------------------------------------------------

type CsvRow = Record<string, string>;

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, CRLF or LF rows. */
/** One quoted field, starting at its opening quote. Doubled quotes are literals. */
function readQuotedField(text: string, start: number): { value: string; nextIndex: number } {
  let value = "";
  let index = start + 1;
  while (index < text.length) {
    const char = text[index];
    if (char !== '"') {
      // A quoted field may legitimately contain separators and newlines.
      value += char;
      index += 1;
      continue;
    }
    if (text[index + 1] === '"') {
      value += '"';
      index += 2;
      continue;
    }
    return { value, nextIndex: index + 1 };
  }
  return { value, nextIndex: index };
}

/** Split RFC 4180 text into rows and fields. */
function parseCsvCells(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let index = 0;

  while (index < text.length) {
    const char = text[index];
    if (char === '"') {
      const quoted = readQuotedField(text, index);
      field += quoted.value;
      index = quoted.nextIndex;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      index += 1;
      continue;
    }
    if (char === "\r") {
      index += 1;
      continue;
    }
    if (char === "\n") {
      rows.push([...row, field]);
      row = [];
      field = "";
      index += 1;
      continue;
    }
    field += char;
    index += 1;
  }
  if (field.length > 0 || row.length > 0) rows.push([...row, field]);
  return rows;
}

export function parseCsv(text: string): CsvRow[] {
  const [header, ...body] = parseCsvCells(text);
  return body.map((cells) =>
    Object.fromEntries((header ?? []).map((name, index) => [name, cells[index] ?? ""]))
  );
}

async function csv(): Promise<{ text: string; rows: CsvRow[] }> {
  const built = await buildRawQuantitativeCsv(reportEvidenceFixture());
  return { text: built.csv, rows: parseCsv(built.csv) };
}

describe("raw quantitative CSV", () => {
  it("writes stable headers and one row per submitted answer item", async () => {
    const { text, rows } = await csv();
    const [header] = text.split("\r\n");
    expect(header?.split(",")).toEqual([...RAW_CSV_HEADERS]);
    // Course-bound answers 10 + 2 + 4 = 16; program-wide answers 4 + 1 + 1 = 6.
    expect(rows).toHaveLength(22);
    expect(new Set(rows.map((row) => row.response_id)).size).toBe(12);
  });

  it("keeps each response's own ratings unmodified", async () => {
    const { rows } = await csv();
    const annMorning = rows.filter(
      (row) => row.response_id === "resp-it101-ann" && row.deployment_type === "COURSE_BOUND"
    );
    expect(annMorning).toHaveLength(4);
    expect(annMorning.map((row) => row.question_item_key)).toEqual([
      "cilo-1-q1",
      "cilo-1-q2",
      "cilo-2-q1",
      "general-q1",
    ]);
    expect(annMorning.map((row) => row.rating_value)).toEqual(["4", "5", "2", "3"]);
    // The out-of-scale answer is exported verbatim; validity is a report concern.
    const invalid = rows.find((row) => row.rating_value === "9");
    expect(invalid?.response_id).toBe("resp-it101-ben-1");
  });

  it("carries the respondent's full name beside the answers", async () => {
    const { rows } = await csv();
    const named = rows.filter((row) => row.respondent_name === "Alpha, Ann");
    // Ann answered in the morning class, the afternoon class, and program-wide;
    // one respondent, three separate responses, no merged rows.
    expect([...new Set(named.map((row) => row.response_id))].sort()).toEqual([
      "resp-it101-ann",
      "resp-it101-pm-ann",
      "resp-pw-ann",
    ]);
    // Two different respondents share one name and never merge into one row set.
    const duplicateName = rows.filter((row) => row.respondent_name === "Bravo, Ben");
    expect(new Set(duplicateName.map((row) => row.response_id))).toEqual(
      new Set(["resp-it101-ben-1", "resp-it101-ben-2"])
    );
    // A blank account name is reported explicitly.
    const unnamed = rows.filter((row) => row.respondent_id === "user-no-name");
    expect(unnamed.length).toBeGreaterThan(0);
    expect(unnamed.every((row) => row.respondent_name === "Name unavailable")).toBe(true);
  });

  it("keeps class-group context on every course row", async () => {
    const { rows } = await csv();
    const morning = rows.find((row) => row.course_assignment_id === "ca-it101-dela-cruz")!;
    expect(morning.course_code).toBe("IT101");
    expect(morning.course_title).toBe("Introduction to Computing");
    expect(morning.faculty_name).toBe("Dela Cruz, Ana");
    expect(morning.section).toBe("MORNING");
    expect(morning.year_level).toBe("1st Year");
    expect(morning.deployment_name).toBe("IT101 First Term CILO Evaluation");
    expect(morning.deployment_status).toBe("CLOSED");
    expect(morning.instrument_name).toBe("CILO Evaluation");
    expect(morning.instrument_version).toBe("v1");
    expect(morning.period_school_year).toBe("2026-2027");
    expect(morning.period_semester).toBe("1st Semester");
    expect(morning.period_term).toBe("1st Term");

    const afternoon = rows.find((row) => row.course_assignment_id === "ca-it101-santos")!;
    expect(afternoon.section).toBe("AFTERNOON");
    expect(afternoon.faculty_name).toBe("Santos, Ben");
    expect(afternoon.instrument_version).toBe("v2");
  });

  it("reports CILO and Program Outcome alignment with classifications", async () => {
    const { rows } = await csv();
    const cilo2 = rows.find(
      (row) => row.response_id === "resp-it102-eda" && row.question_item_key === "cilo-3-q1"
    )!;
    // CILO 3 maps to two Program Outcomes: each receives the contribution.
    expect(cilo2.po_codes).toBe("BSIT-GO1 | BSIT-GO2");
    expect(cilo2.po_classifications).toBe("Core | Professional");
    expect(cilo2.manifestations).toBe("Learning | Practice");
    expect(cilo2.cilo_code).toBe("CILO 1");
    expect(cilo2.cilo_description).toBe("Model an information system");

    // Legacy GO-era codes are printed unchanged.
    const direct = rows.find((row) => row.question_item_key === "po-direct-1")!;
    expect(direct.direct_po_codes).toBe("BSIT-GO4");
    expect(direct.po_codes).toBe("");
    expect(direct.direct_po_classifications).toBe("Needs classification");

    // `general-q1` reaches its Program Outcome through the direct question
    // binding, so it carries no CILO mapping columns.
    const general = rows.find((row) => row.question_item_key === "general-q1")!;
    expect(general.cilo_code).toBe("");
    expect(general.po_codes).toBe("");
    expect(general.direct_po_codes).toBe("BSIT-GO1");
    expect(general.manifestations).toBe("");
  });

  it("prints the exact scale identity and the answered option's descriptor", async () => {
    const { rows } = await csv();
    const attainment = rows.find(
      (row) => row.response_id === "resp-it101-ann" && row.question_item_key === "cilo-1-q1"
    )!;
    expect(attainment.scale_label).toBe("1–5 (5-point) · Not Achieved → Fully Achieved");
    expect(attainment.rating_descriptor).toBe("Mostly Achieved");

    const agreement = rows.find((row) => row.response_id === "resp-it101-pm-ann")!;
    expect(agreement.scale_label).toBe("1–5 (5-point) · Strongly Disagree → Strongly Agree");
    expect(agreement.rating_descriptor).toBe("Agree");

    // The legacy unlabeled numeric scale has no descriptor text to print.
    const unlabeled = rows.find((row) => row.question_item_key === "po-direct-1")!;
    expect(unlabeled.scale_label).toBe("1–5 (5-point) · unlabeled options");
    expect(unlabeled.rating_descriptor).toBe("");
  });

  it("keeps program-wide evidence separated by respondent category", async () => {
    const { rows } = await csv();
    const central = rows.filter((row) => row.deployment_type === "CENTRAL");
    expect(new Set(central.map((row) => row.evidence_source))).toEqual(
      new Set(["Program-wide student", "Alumni", "Industry partner"])
    );
    const student = central.find(
      (row) => row.deployment_id === "dep-pw-student" && row.question_item_key === "po-q1"
    )!;
    // One published question covering two Program Outcomes repeats the code in
    // both the mapping columns and the direct-binding columns.
    expect(student.direct_po_codes).toBe("BSIT-GO1 | BSIT-GO3");
    expect(student.respondent_category).toBe("Student");
    const alumni = central.find((row) => row.deployment_id === "dep-alumni")!;
    expect(alumni.respondent_category).toBe("Alumni");
    expect(alumni.direct_po_codes).toBe("BSIT-GO1");
    const industry = central.find((row) => row.deployment_id === "dep-industry")!;
    expect(industry.respondent_category).toBe("Industry partner");
    expect(industry.direct_po_codes).toBe("BSIT-GO2");
    // Course rows never carry a Central respondent category.
    const course = rows.find((row) => row.deployment_type === "COURSE_BOUND")!;
    expect(course.respondent_category).toBe("Student");
    expect(course.evidence_source).toBe("Course-bound student");
  });

  it("orders rows deterministically", async () => {
    const first = await csv();
    const second = await csv();
    expect(second.text).toBe(first.text);
    const courseRows = first.rows.filter((row) => row.deployment_type === "COURSE_BOUND");
    expect(courseRows.map((row) => row.course_code).slice(0, 2)).toEqual(["IT101", "IT101"]);
    expect(first.text.endsWith("\r\n")).toBe(true);
  });

  it("never exposes student numbers, emails, or account identifiers", async () => {
    const { text } = await csv();
    expect(text).not.toContain("@");
    expect(text).toContain("respondent_id");
    // Only internal identifiers are exported, never an account address.
    expect(text).not.toMatch(/[a-z.]+@[a-z]+\.[a-z]+/i);
  });
});

describe("raw quantitative CSV escaping and formula safety", () => {
  const hostileEvidence = (): ReportEvidence => {
    const evidence = reportEvidenceFixture();
    const group = structuredClone(evidence.courseGroups[0]);
    group.facultyName = 'Santos, "Ben"\nO\'Brien';
    group.responses[0].respondentName = "=cmd|'/c calc'!A1";
    group.responses[0].answers[0].ratingValue = 5;
    group.structureSnapshot = [
      {
        key: "cilo-items",
        title: "CILO Results",
        questions: [
          {
            key: "cilo-1-q1",
            type: "likert",
            prompt: 'Rate this: "clarity", and detail.',
            likertDescriptors: [
              { value: 1, label: "Not Achieved" },
              { value: 5, label: "Fully Achieved" },
            ],
          },
        ],
      },
    ];
    group.ciloBindings = [
      {
        sectionKey: "cilo-items",
        itemKey: "cilo-1-q1",
        ciloId: "cilo-1",
        ciloLabel: "CILO 1",
        ciloDescription: 'Explain, in "detail"',
        questionPrompt: 'Rate this: "clarity", and detail.',
      },
    ];
    group.directPoBindings = [];
    return { ...evidence, courseGroups: [group], centralGroups: [] };
  };

  it("escapes commas, quotes, and newlines", async () => {
    const { text, rows } = await (async () => {
      const built = await buildRawQuantitativeCsv(hostileEvidence());
      return { text: built.csv, rows: parseCsv(built.csv) };
    })();
    expect(text).toContain('"Santos, ""Ben""\nO\'Brien"');
    const row = rows.find((entry) => entry.faculty_name.includes("Santos"))!;
    expect(row.faculty_name).toBe('Santos, "Ben"\nO\'Brien');
    expect(row.question_prompt).toBe('Rate this: "clarity", and detail.');
    expect(row.cilo_description).toBe('Explain, in "detail"');
  });

  it("neutralizes a value a spreadsheet would execute as a formula", async () => {
    const { rows, text } = await (async () => {
      const built = await buildRawQuantitativeCsv(hostileEvidence());
      return { text: built.csv, rows: parseCsv(built.csv) };
    })();
    const row = rows.find((entry) => entry.respondent_name.includes("cmd"))!;
    expect(row.respondent_name.startsWith("'")).toBe(true);
    expect(text).toContain("'=cmd|'/c calc'!A1");
    // The rating itself stays an unmodified number.
    expect(row.rating_value).toBe("5");
  });
});

describe("raw quantitative CSV with no evidence", () => {
  it("returns only the header row for an empty scope", async () => {
    const built = await buildRawQuantitativeCsv({
      ...reportEvidenceFixture(),
      courseGroups: [],
      centralGroups: [],
    });
    expect(built.rowCount).toBe(0);
    expect(built.responseCount).toBe(0);
    expect(built.csv.trimEnd()).toBe(RAW_CSV_HEADERS.join(","));
  });

  it("keeps group structure when a class group has no submitted responses", async () => {
    const evidence = reportEvidenceFixture();
    const emptyGroup = { ...GROUP_IT101_MORNING, responses: [], courseCode: "IT199" };
    const built = await buildRawQuantitativeCsv({
      ...evidence,
      courseGroups: [emptyGroup, ...evidence.courseGroups.slice(1)],
    });
    // The empty class group contributes nothing; the rest of the scope is intact.
    expect(built.rowCount).toBe(12);
    expect(built.csv).not.toContain("IT199");
  });
});
