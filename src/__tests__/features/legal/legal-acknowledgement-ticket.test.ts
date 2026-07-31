import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLegalAcknowledgementTicket,
  LEGAL_ACKNOWLEDGEMENT_MAX_AGE_SECONDS,
  verifyLegalAcknowledgementTicket,
} from "@/features/legal/services/legal-acknowledgement-ticket";

describe("legal acknowledgement ticket", () => {
  beforeEach(() => {
    vi.stubEnv("CLOIE_LEGAL_TICKET_SECRET", "legal-ticket-test-secret-012345678901");
  });

  it("signs and verifies a minimal current intent-bound ticket", () => {
    const ticket = createLegalAcknowledgementTicket("industry-partner", 1000);
    const result = verifyLegalAcknowledgementTicket(ticket, "industry-partner", 1001);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload).toEqual({
        intent: "industry-partner",
        privacyVersion: "1.0",
        termsVersion: "1.0",
        issuedAt: 1000,
        expiresAt: 1000 + LEGAL_ACKNOWLEDGEMENT_MAX_AGE_SECONDS,
      });
    }
  });

  it("rejects malformed, tampered, expired, and mismatched tickets", () => {
    const ticket = createLegalAcknowledgementTicket("student", 1000);
    expect(verifyLegalAcknowledgementTicket(null, "student", 1001).valid).toBe(false);
    expect(verifyLegalAcknowledgementTicket(`${ticket}x`, "student", 1001).valid).toBe(false);
    expect(verifyLegalAcknowledgementTicket(ticket, "faculty", 1001).valid).toBe(false);
    expect(verifyLegalAcknowledgementTicket(ticket, "student", 1000 + LEGAL_ACKNOWLEDGEMENT_MAX_AGE_SECONDS).valid).toBe(false);
  });

  it("fails closed when the signing secret is absent or too short", () => {
    vi.stubEnv("CLOIE_LEGAL_TICKET_SECRET", "short");
    expect(() => createLegalAcknowledgementTicket("student", 1000)).toThrow();
    expect(verifyLegalAcknowledgementTicket(null, "student", 1000)).toEqual({ valid: false, reason: "not-configured" });
  });
});
