import { SystemRole } from "@prisma/client";
import type { EditUserBySecretaryInput } from "../schemas/edit-user";

/** The active-or-historical Program Head assignment rows the edit read selects. */
type ProgramHeadAssignmentRow = {
  program_id: string;
  is_active: boolean;
  program?: { name: string | null; code: string | null } | null;
};

/** The account record a protected review is projected from. */
type ProtectedEditSource = {
  student_profile: {
    program_id: string;
    major_id: string | null;
    program: { name: string } | null;
    major: { name: string } | null;
  } | null;
  enrollments: Array<{ year_level: string | null; section: string | null }>;
  faculty_program_affiliations: Array<{
    program_id: string;
    program: { name: string } | null;
  }>;
  program_head_assignments: ProgramHeadAssignmentRow[] | undefined;
  alumni_profile: {
    program_id: string;
    major_id: string | null;
    graduation_year: number;
    verification_status: string;
    program: { name: string } | null;
    major: { name: string } | null;
  } | null;
  industry_partner_profile: {
    company_name: string;
    position: string | null;
    program_id: string | null;
    verification_status: string;
    program: { name: string } | null;
  } | null;
};

type AlumniProfileState = {
  program_id: string;
  major_id: string | null;
  graduation_year: number;
  verification_status: string;
  programLabel: string | null;
  majorLabel: string | null;
};

type IndustryPartnerProfileState = {
  company_name: string;
  position: string | null;
  program_id: string | null;
  verification_status: string;
  programLabel: string | null;
};

/**
 * The reviewed before-state of a role-bound Secretary edit: the identifiers the
 * request is compared and tokenized against, plus the display labels the
 * confirmation review shows. It is projected once and shared by the payload,
 * change detection, and review builders so those never re-read the record.
 */
type ProtectedEditState = {
  studentProgramId: string | null;
  studentMajorId: string | null;
  studentProgramLabel: string | null;
  studentMajorLabel: string | null;
  enrollment: { year_level: string | null; section: string | null } | null;
  facultyPrimaryProgramId: string | null;
  facultyPrimaryProgramLabel: string | null;
  programHeadActiveIds: string[];
  programHeadActiveLabels: string[];
  alumniProfile: AlumniProfileState | null;
  industryPartnerProfile: IndustryPartnerProfileState | null;
};

type ConfirmationReview = {
  role: SystemRole;
  oldValues: Record<string, string>;
  newValues: Record<string, string>;
};

/** One program's catalog entry, used to label requested after-values. */
type ProgramCatalogEntry = {
  id: string;
  name: string;
  majors: Array<{ id: string; name: string }>;
};

const NONE = "None";

/**
 * One protected field of a role: how it is tokenized into the signed payload,
 * labelled in the confirmation review, and compared for change detection.
 */
type ProtectedField = {
  /** Payload token key; null emits the bare encoded value (single-value roles). */
  tokenKey: string | null;
  /** Confirmation-review label key. */
  reviewKey: string;
  /** Encodes a payload value segment. Defaults to the null-stable token encoding. */
  encode?: (value: string | number | null | undefined) => string;
  /** Reviewed before-value: payload token and change comparison. */
  before: (state: ProtectedEditState) => string | number | null | undefined;
  /** Reviewed before-label shown to the Secretary. */
  beforeLabel: (state: ProtectedEditState) => string | null;
  /** Requested after-value: payload token and change comparison. */
  after: (input: EditUserBySecretaryInput) => string | number | null | undefined;
  /** Requested after-label. Defaults to the display form of the after-value. */
  afterLabel?: (input: EditUserBySecretaryInput) => string;
  /** Restricts change detection to requests that actually carry this field. */
  changedWhen?: (input: EditUserBySecretaryInput) => boolean;
};

/**
 * The protected surface of one role: the role-specific request section that
 * activates it, and the fields the Secretary must review. Roles without a
 * protected surface carry no section and no fields.
 */
type ProtectedRoleSpec = {
  section: (input: EditUserBySecretaryInput) => unknown;
  fields: ProtectedField[];
};

const studentPlacementProvided = (input: EditUserBySecretaryInput): boolean =>
  Boolean(input.student?.year_level) && Boolean(input.student?.section);

/** Sorted Program Head assignment ids; the complete reviewed before-set. */
const activeAssignmentIds = (state: ProtectedEditState): string =>
  state.programHeadActiveIds.join(",");

/** Stable token segment for optional IDs/values (empty string → null). */
function tokenValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "null";
  return String(value);
}

/** Stable display fallback for an absent label, id, or optional value. */
function displayValue(value: string | number | null | undefined): string {
  return tokenValue(value) === "null" ? NONE : String(value);
}

/** Sorted, comma-joined labels; "None" when the set is empty. */
function formatProgramSet(labels: string[]): string {
  return labels.sort((a, b) => a.localeCompare(b)).join(", ") || NONE;
}

const STUDENT_FIELDS: ProtectedField[] = [
  {
    tokenKey: "program",
    reviewKey: "program",
    before: (state) => state.studentProgramId,
    beforeLabel: (state) => state.studentProgramLabel,
    after: (input) => input.student?.program_id,
  },
  {
    tokenKey: "major",
    reviewKey: "major",
    before: (state) => state.studentMajorId,
    beforeLabel: (state) => state.studentMajorLabel,
    after: (input) => input.student?.major_id ?? null,
  },
  {
    tokenKey: "year",
    reviewKey: "year",
    before: (state) => state.enrollment?.year_level ?? null,
    beforeLabel: (state) => state.enrollment?.year_level ?? null,
    after: (input) => input.student?.year_level ?? null,
    changedWhen: studentPlacementProvided,
  },
  {
    tokenKey: "section",
    reviewKey: "section",
    before: (state) => state.enrollment?.section ?? null,
    beforeLabel: (state) => state.enrollment?.section ?? null,
    after: (input) => input.student?.section ?? null,
    changedWhen: studentPlacementProvided,
  },
];

const FACULTY_FIELDS: ProtectedField[] = [
  {
    tokenKey: null,
    reviewKey: "program",
    before: (state) => state.facultyPrimaryProgramId,
    beforeLabel: (state) => state.facultyPrimaryProgramLabel,
    after: (input) => input.faculty?.program_id,
  },
];

const PROGRAM_HEAD_FIELDS: ProtectedField[] = [
  {
    tokenKey: null,
    reviewKey: "programs",
    // The assignment set tokenizes as the sorted id list; an empty set stays
    // empty rather than taking the absent-value token.
    encode: (value) => String(value ?? ""),
    before: (state) => activeAssignmentIds(state),
    beforeLabel: (state) => formatProgramSet([...state.programHeadActiveLabels]),
    after: (input) => [...(input.program_head?.program_ids ?? [])].sort().join(","),
    afterLabel: () => "",
  },
];

const ALUMNI_FIELDS: ProtectedField[] = [
  {
    tokenKey: "program",
    reviewKey: "program",
    before: (state) => state.alumniProfile?.program_id,
    beforeLabel: (state) => state.alumniProfile?.programLabel ?? null,
    after: (input) => input.alumni?.program_id,
  },
  {
    tokenKey: "major",
    reviewKey: "major",
    before: (state) => state.alumniProfile?.major_id ?? null,
    beforeLabel: (state) => state.alumniProfile?.majorLabel ?? null,
    after: (input) => input.alumni?.major_id ?? null,
  },
  {
    tokenKey: "graduationYear",
    reviewKey: "graduationYear",
    before: (state) => state.alumniProfile?.graduation_year,
    beforeLabel: (state) => String(state.alumniProfile?.graduation_year ?? NONE),
    after: (input) => input.alumni?.graduation_year,
  },
  {
    tokenKey: "verificationStatus",
    reviewKey: "verification",
    before: (state) => state.alumniProfile?.verification_status,
    beforeLabel: (state) => state.alumniProfile?.verification_status ?? null,
    after: (input) => input.alumni?.verification_status,
  },
];

const INDUSTRY_PARTNER_FIELDS: ProtectedField[] = [
  {
    tokenKey: "company",
    reviewKey: "company",
    before: (state) => state.industryPartnerProfile?.company_name,
    beforeLabel: (state) => state.industryPartnerProfile?.company_name ?? null,
    after: (input) => input.industry_partner?.company_name,
  },
  {
    tokenKey: "position",
    reviewKey: "position",
    before: (state) => state.industryPartnerProfile?.position ?? null,
    beforeLabel: (state) => state.industryPartnerProfile?.position ?? null,
    after: (input) => input.industry_partner?.position || null,
    afterLabel: (input) => input.industry_partner?.position ?? NONE,
  },
  {
    tokenKey: "program",
    reviewKey: "program",
    before: (state) => state.industryPartnerProfile?.program_id ?? null,
    beforeLabel: (state) => state.industryPartnerProfile?.programLabel ?? null,
    after: (input) => input.industry_partner?.program_id ?? null,
    afterLabel: (input) => input.industry_partner?.program_id ?? NONE,
  },
  {
    tokenKey: "verificationStatus",
    reviewKey: "verification",
    before: (state) => state.industryPartnerProfile?.verification_status,
    beforeLabel: (state) => state.industryPartnerProfile?.verification_status ?? null,
    after: (input) => input.industry_partner?.verification_status,
  },
];

const NO_PROTECTED_FIELDS: ProtectedRoleSpec = { section: () => null, fields: [] };

/** The protected surface of every role, keyed by the account role being edited. */
const PROTECTED_ROLES: Record<SystemRole, ProtectedRoleSpec> = {
  [SystemRole.STUDENT]: { section: (input) => input.student, fields: STUDENT_FIELDS },
  [SystemRole.FACULTY]: { section: (input) => input.faculty, fields: FACULTY_FIELDS },
  [SystemRole.PROGRAM_HEAD]: {
    section: (input) => input.program_head,
    fields: PROGRAM_HEAD_FIELDS,
  },
  [SystemRole.ALUMNI]: { section: (input) => input.alumni, fields: ALUMNI_FIELDS },
  [SystemRole.INDUSTRY_PARTNER]: {
    section: (input) => input.industry_partner,
    fields: INDUSTRY_PARTNER_FIELDS,
  },
  [SystemRole.SECRETARY]: NO_PROTECTED_FIELDS,
  [SystemRole.DEAN]: NO_PROTECTED_FIELDS,
  [SystemRole.GEN_ED_COORDINATOR]: NO_PROTECTED_FIELDS,
};

/**
 * Projects the reviewed before-state from the account record. This is the one
 * place the raw record is read, so the payload, change detection, and review
 * all compare and display exactly the same reviewed values.
 */
export function projectProtectedEditState(existing: ProtectedEditSource): ProtectedEditState {
  const studentProfile = existing.student_profile;
  const alumniProfile = existing.alumni_profile;
  const industryPartnerProfile = existing.industry_partner_profile;
  const facultyPrimary = existing.faculty_program_affiliations[0] ?? null;
  const activeAssignments = (existing.program_head_assignments ?? []).filter(
    (assignment) => assignment.is_active
  );

  return {
    studentProgramId: studentProfile ? studentProfile.program_id : null,
    studentMajorId: studentProfile ? studentProfile.major_id : null,
    studentProgramLabel: studentProfile?.program?.name ?? null,
    studentMajorLabel: studentProfile?.major?.name ?? null,
    enrollment: existing.enrollments[0] ?? null,
    facultyPrimaryProgramId: facultyPrimary ? facultyPrimary.program_id : null,
    facultyPrimaryProgramLabel: facultyPrimary?.program?.name ?? null,
    programHeadActiveIds: activeAssignments.map((assignment) => assignment.program_id).sort(),
    programHeadActiveLabels: activeAssignments.map(
      (assignment) => assignment.program?.name ?? assignment.program_id
    ),
    alumniProfile: alumniProfile ? projectAlumniProfile(alumniProfile) : null,
    industryPartnerProfile: industryPartnerProfile
      ? projectIndustryPartnerProfile(industryPartnerProfile)
      : null,
  };
}

function projectAlumniProfile(
  profile: NonNullable<ProtectedEditSource["alumni_profile"]>
): AlumniProfileState {
  return {
    program_id: profile.program_id,
    major_id: profile.major_id,
    graduation_year: profile.graduation_year,
    verification_status: profile.verification_status,
    programLabel: profile.program?.name ?? null,
    majorLabel: profile.major?.name ?? null,
  };
}

function projectIndustryPartnerProfile(
  profile: NonNullable<ProtectedEditSource["industry_partner_profile"]>
): IndustryPartnerProfileState {
  return {
    company_name: profile.company_name,
    position: profile.position,
    program_id: profile.program_id,
    verification_status: profile.verification_status,
    programLabel: profile.program?.name ?? null,
  };
}

function payloadSegment(field: ProtectedField, value: string | number | null | undefined): string {
  const encode = field.encode ?? tokenValue;
  return field.tokenKey ? `${field.tokenKey}=${encode(value)}` : encode(value);
}

/**
 * Derives a deterministic protected payload string for the requested changes.
 * The confirmation token is bound to both the reviewed before-state and the
 * requested after-state. A current-state re-read on every request therefore
 * makes a stale confirmation (an intervening administrator change) fail
 * verification instead of authorizing an overwrite. Returns null when the
 * request carries no role-specific section, so nothing protected is signed.
 */
export function deriveProtectedPayload(
  parsedData: EditUserBySecretaryInput,
  existingRole: SystemRole,
  userId: string,
  reviewed: ProtectedEditState
): string | null {
  const { section, fields } = PROTECTED_ROLES[existingRole];
  if (fields.length === 0 || !section(parsedData)) return null;
  const before = fields.map((field) => payloadSegment(field, field.before(reviewed)));
  const after = fields.map((field) => payloadSegment(field, field.after(parsedData)));
  return `${existingRole}:id=${userId}:before=${before.join(":")}:after=${after.join(":")}`;
}

/**
 * Whether the request moves a protected field away from the reviewed
 * before-state. A request resubmitting the reviewed values is not a protected
 * change and must not require a confirmation token.
 */
export function protectedChangeDetected(
  parsedData: EditUserBySecretaryInput,
  existingRole: SystemRole,
  reviewed: ProtectedEditState
): boolean {
  const { section, fields } = PROTECTED_ROLES[existingRole];
  if (fields.length === 0 || !section(parsedData)) return false;
  return fields.some(
    (field) =>
      (!field.changedWhen || field.changedWhen(parsedData)) &&
      field.before(reviewed) !== field.after(parsedData)
  );
}

/**
 * The explicit review the Secretary confirms before a protected field changes:
 * per role, the reviewed before-labels and the requested after-values. Returns
 * undefined when the request carries no role-specific section, in which case
 * nothing protected is being reviewed.
 */
export function buildConfirmationReview(
  parsedData: EditUserBySecretaryInput,
  existingRole: SystemRole,
  reviewed: ProtectedEditState
): ConfirmationReview | undefined {
  const { section, fields } = PROTECTED_ROLES[existingRole];
  if (fields.length === 0 || !section(parsedData)) return undefined;

  const oldValues: Record<string, string> = {};
  const newValues: Record<string, string> = {};
  for (const field of fields) {
    oldValues[field.reviewKey] = displayValue(field.beforeLabel(reviewed));
    newValues[field.reviewKey] = field.afterLabel
      ? field.afterLabel(parsedData)
      : displayValue(field.after(parsedData));
  }
  return { role: existingRole, oldValues, newValues };
}

/**
 * Resolves the requested after-values to their catalog labels for display in
 * the confirmation review. Ids missing from the catalog stay as-is so the
 * review never hides an unresolvable selection.
 */
export function hydrateReviewLabels(
  review: ConfirmationReview,
  parsedData: EditUserBySecretaryInput,
  catalogs: ProgramCatalogEntry[]
): ConfirmationReview {
  const labels = new Map(catalogs.map((program) => [program.id, program.name]));
  const majorLabels = new Map(
    catalogs.flatMap((program) => program.majors.map((major) => [major.id, major.name]))
  );

  const requestedProgram =
    parsedData.student?.program_id ??
    parsedData.faculty?.program_id ??
    parsedData.alumni?.program_id ??
    parsedData.industry_partner?.program_id;
  if (requestedProgram) {
    review.newValues.program = labels.get(requestedProgram) ?? requestedProgram;
  }

  if (parsedData.program_head) {
    review.newValues.programs = formatProgramSet(
      parsedData.program_head.program_ids.map((programId) => labels.get(programId) ?? programId)
    );
  }

  const requestedMajor = parsedData.student?.major_id ?? parsedData.alumni?.major_id;
  if (requestedMajor) {
    review.newValues.major = majorLabels.get(requestedMajor) ?? requestedMajor;
  }
  return review;
}
