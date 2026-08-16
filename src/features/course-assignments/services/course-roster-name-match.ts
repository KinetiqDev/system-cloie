import { normalizeRosterName } from "./course-roster-csv";

// Public contract of the name-evidence module; first consumer is the
// scoped roster preview service (#394), which imports these types for its
// candidate read model and row diagnostics.
// fallow-ignore-next-line unused-type
export type RosterNameMatchStatus =
  | "EXACT_MATCH"
  | "SUGGESTED_MATCH"
  | "AMBIGUOUS"
  | "NO_MATCH";

// fallow-ignore-next-line unused-type
export type RosterNameMatchReason =
  | "EXACT"
  | "MIDDLE_TOKEN"
  | "INITIAL"
  | "SEPARATOR_PUNCTUATION"
  | "SUFFIX"
  | "DIACRITIC"
  | "EQUAL_TIER"
  | "NO_EVIDENCE";

// fallow-ignore-next-line unused-type
export type RosterNameCandidate = {
  id: string;
  name: string;
};

// fallow-ignore-next-line unused-type
export type RosterNameMatch = {
  status: RosterNameMatchStatus;
  reason: RosterNameMatchReason;
  matchedIds: string[];
};

const SUGGESTION_TIERS = [
  "MIDDLE_TOKEN",
  "INITIAL",
  "SEPARATOR_PUNCTUATION",
  "SUFFIX",
  "DIACRITIC",
] as const;

type SuggestionReason = (typeof SUGGESTION_TIERS)[number];

const SEPARATORS = /[-–—'’‘ʼ.]/gu;
const SUFFIXES: Record<string, true> = { jr: true, sr: true, ii: true, iii: true, iv: true, v: true };

/**
 * Unicode-aware case folding without a dependency: locale-independent
 * lowercase plus the fold rules that plain lowercase does not apply
 * (ß → ss, dotted I → plain i, covering both precomposed İ and its
 * decomposed i + U+0307 spelling). NFKC normalization is expected
 * upstream.
 */
function caseFold(value: string) {
  return value
    .toLocaleLowerCase("und")
    .replace(/i\u0307/gu, "i")
    .replace(/ß/gu, "ss");
}

export function normalizeRosterNameKey(name: string) {
  return caseFold(normalizeRosterName(name));
}

export function matchRosterName(
  uploadedName: string,
  candidates: readonly RosterNameCandidate[]
): RosterNameMatch {
  const exactIds = candidates
    .filter((candidate) => normalizeRosterNameKey(uploadedName) === normalizeRosterNameKey(candidate.name))
    .map((candidate) => candidate.id);
  if (exactIds.length === 1) {
    return { status: "EXACT_MATCH", reason: "EXACT", matchedIds: exactIds };
  }
  if (exactIds.length > 1) {
    return { status: "AMBIGUOUS", reason: "EQUAL_TIER", matchedIds: exactIds };
  }

  for (const tier of SUGGESTION_TIERS) {
    const matchedIds = candidates
      .filter((candidate) => matchesSuggestion(uploadedName, candidate.name, tier))
      .map((candidate) => candidate.id);
    if (matchedIds.length === 1) {
      return { status: "SUGGESTED_MATCH", reason: tier, matchedIds };
    }
    if (matchedIds.length > 1) {
      return { status: "AMBIGUOUS", reason: "EQUAL_TIER", matchedIds };
    }
  }

  return { status: "NO_MATCH", reason: "NO_EVIDENCE", matchedIds: [] };
}

function matchesSuggestion(uploadedName: string, candidateName: string, tier: SuggestionReason) {
  const uploaded = normalizeRosterNameKey(uploadedName);
  const candidate = normalizeRosterNameKey(candidateName);
  if (uploaded === candidate || uploaded === "" || candidate === "") {
    return false;
  }

  switch (tier) {
    case "MIDDLE_TOKEN":
      return matchesMiddleToken(uploaded.split(" "), candidate.split(" "));
    case "INITIAL":
      return matchesInitials(uploaded.split(" "), candidate.split(" "));
    case "SEPARATOR_PUNCTUATION":
      return matchesSeparator(uploaded, candidate);
    case "SUFFIX":
      return matchesSuffix(uploaded.split(" "), candidate.split(" "));
    case "DIACRITIC":
      return foldMarks(uploaded) === foldMarks(candidate);
  }
}

function stripTrailingPeriod(token: string) {
  return token.replace(/\.+$/u, "");
}

function matchesMiddleToken(uploaded: string[], candidate: string[]) {
  if (uploaded.length < 2 || candidate.length < 2) {
    return false;
  }
  if (uploaded[0] !== candidate[0] || uploaded.at(-1) !== candidate.at(-1)) {
    return false;
  }

  const uploadedMiddle = uploaded.slice(1, -1);
  const candidateMiddle = candidate.slice(1, -1);
  if (uploadedMiddle.length === candidateMiddle.length) {
    return false;
  }

  const [shorter, longer] =
    uploadedMiddle.length < candidateMiddle.length
      ? [uploadedMiddle, candidateMiddle]
      : [candidateMiddle, uploadedMiddle];
  return isSubsequence(shorter, longer);
}

function isSubsequence(shorter: string[], longer: string[]) {
  if (shorter.length === 0) {
    return true;
  }

  let index = 0;
  for (const token of longer) {
    if (token === shorter[index]) {
      index += 1;
      if (index === shorter.length) {
        return true;
      }
    }
  }
  return false;
}

function isInitialExpansion(left: string, right: string) {
  return (
    (left.length === 1 && /\p{L}/u.test(left) && right.startsWith(left)) ||
    (right.length === 1 && /\p{L}/u.test(right) && left.startsWith(right))
  );
}

function matchesInitials(uploaded: string[], candidate: string[]) {
  if (uploaded.length < 2 || uploaded.length !== candidate.length) {
    return false;
  }

  let expanded = false;
  for (const [index, uploadedToken] of uploaded.entries()) {
    const left = stripTrailingPeriod(uploadedToken);
    const right = stripTrailingPeriod(candidate[index] ?? "");
    if (left === right) {
      continue;
    }
    if (!isInitialExpansion(left, right)) {
      return false;
    }
    expanded = true;
  }
  return expanded;
}

function matchesSeparator(uploaded: string, candidate: string) {
  const uploadedForms = separatorForms(uploaded);
  const candidateForms = separatorForms(candidate);
  return (
    uploadedForms.spaced === candidateForms.spaced ||
    uploadedForms.compact === candidateForms.compact
  );
}

function separatorForms(key: string) {
  return {
    spaced: key.replace(SEPARATORS, " ").replace(/\s+/gu, " ").trim(),
    compact: key.replace(SEPARATORS, "").replace(/\s+/gu, " ").trim(),
  };
}

function matchesSuffix(uploaded: string[], candidate: string[]) {
  const left = stripRecognizedSuffix(uploaded);
  const right = stripRecognizedSuffix(candidate);
  if (!left.stripped && !right.stripped) {
    return false;
  }
  if (left.stripped && right.stripped && left.suffix !== right.suffix) {
    return false;
  }
  return (
    left.core.length > 0 &&
    left.core.length === right.core.length &&
    left.core.every((token, index) => token === right.core[index])
  );
}

function stripRecognizedSuffix(values: string[]) {
  if (values.length === 0) {
    return { core: values, stripped: false, suffix: "" };
  }

  const suffix = stripTrailingPeriod(values.at(-1) ?? "");
  if (!Object.hasOwn(SUFFIXES, suffix)) {
    return { core: values, stripped: false, suffix: "" };
  }
  return { core: values.slice(0, -1), stripped: true, suffix };
}

function foldMarks(key: string) {
  return key.normalize("NFKD").replace(/\p{M}/gu, "");
}
