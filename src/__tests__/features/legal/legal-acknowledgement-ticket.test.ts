import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLegalAcknowledgementTicket,
  LEGAL_ACKNOWLEDGEMENT_MAX_AGE_SECONDS,
  readCookieValue,
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
    expect(
      verifyLegalAcknowledgementTicket(
        ticket,
        "student",
        1000 + LEGAL_ACKNOWLEDGEMENT_MAX_AGE_SECONDS
      ).valid
    ).toBe(false);
  });

  it("fails closed when the signing secret is absent or too short", () => {
    vi.stubEnv("CLOIE_LEGAL_TICKET_SECRET", "short");
    expect(() => createLegalAcknowledgementTicket("student", 1000)).toThrow();
    expect(verifyLegalAcknowledgementTicket(null, "student", 1000)).toEqual({
      valid: false,
      reason: "not-configured",
    });
  });

  it("ignores malformed percent-encoded cookie values", () => {
    expect(readCookieValue("cloie_legal_ack=%", "cloie_legal_ack")).toBeNull();
  });

  it("rejects ticket components containing characters outside the base64url alphabet", () => {
    const ticket = createLegalAcknowledgementTicket("student", 1000);
    const [payload, signature] = ticket.split(".");

    expect(
      verifyLegalAcknowledgementTicket(`${payload!.slice(0, -1)}!.${signature}`, "student", 1001)
    ).toEqual({ valid: false, reason: "malformed" });
    expect(
      verifyLegalAcknowledgementTicket(`${payload}.${signature!.slice(0, -1)}!`, "student", 1001)
    ).toEqual({ valid: false, reason: "malformed" });
  });

  it("rejects base64url components with lengths congruent to 1 mod 4", () => {
    const ticket = createLegalAcknowledgementTicket("student", 1000);
    const [payload, signature] = ticket.split(".");

    expect(signature!.length % 4).not.toBe(1);
    const impossibleLength = signature!.slice(0, -2);
    expect(impossibleLength.length % 4).toBe(1);
    expect(
      verifyLegalAcknowledgementTicket(`${payload}.${impossibleLength}`, "student", 1001)
    ).toEqual({ valid: false, reason: "malformed" });
  });

  it("rejects non-canonical base64url components with non-zero unused pad bits", () => {
    const ticket = createLegalAcknowledgementTicket("student", 1000);
    const [payload, signature] = ticket.split(".");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const lastCharacter = signature!.at(-1)!;
    const lastIndex = alphabet.indexOf(lastCharacter);
    const nonCanonicalLastIndex = (lastIndex & 0b111100) | 1;
    const nonCanonicalSignature =
      signature!.slice(0, -1) + alphabet[nonCanonicalLastIndex];

    expect(nonCanonicalSignature).not.toBe(signature);
    expect(
      verifyLegalAcknowledgementTicket(`${payload}.${nonCanonicalSignature}`, "student", 1001)
    ).toEqual({ valid: false, reason: "malformed" });

    const payloadLastCharacter = payload!.at(-1)!;
    const payloadLastIndex = alphabet.indexOf(payloadLastCharacter);
    const nonCanonicalPayload =
      payload!.slice(0, -1) + alphabet[(payloadLastIndex & 0b111100) | 1];
    expect(nonCanonicalPayload).not.toBe(payload);
    expect(
      verifyLegalAcknowledgementTicket(`${nonCanonicalPayload}.${signature}`, "student", 1001)
    ).toEqual({ valid: false, reason: "malformed" });
  });
});
