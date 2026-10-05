// Privacy 1.2 records the Course-scope evidence ownership transfer in ADR 0034;
// acknowledgement tickets for the earlier privacy version must fail the gate.
// Terms 1.1 retain the method-neutral entry contract. Both await approval.
export const LEGAL_VERSIONS = {
  privacy: "1.2",
  terms: "1.1",
} as const;
