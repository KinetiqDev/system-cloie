// 1.2 names the General Education Coordinator alongside Program Heads as an
// authorized reader of identified submitted responses, so acknowledgement
// tickets issued against the earlier privacy version must fail the gate
// (issue: General Education evidence ownership). 1.1 replaced the Google-only
// account and credential language with the method-neutral account, code, and
// recovery wording introduced by the scoped entry work (issue #649). Both
// documents stay pending institutional approval.
export const LEGAL_VERSIONS = {
  privacy: "1.2",
  terms: "1.1",
} as const;
