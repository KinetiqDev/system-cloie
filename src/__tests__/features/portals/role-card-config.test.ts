import { describe, it, expect } from "vitest";
import { ROLE_CARDS } from "@/features/portals/lib/role-card-config";
import { ROLES } from "@/lib/constants/roles";

describe("ROLE_CARDS configuration", () => {
  it("contains all 8 system roles", () => {
    const roles = ROLE_CARDS.map((c) => c.role);
    expect(roles).toContain(ROLES.SECRETARY);
    expect(roles).toContain(ROLES.DEAN);
    expect(roles).toContain(ROLES.PROGRAM_HEAD);
    expect(roles).toContain(ROLES.FACULTY);
    expect(roles).toContain(ROLES.STUDENT);
    expect(roles).toContain(ROLES.ALUMNI);
    expect(roles).toContain(ROLES.INDUSTRY_PARTNER);
    expect(roles).toContain(ROLES.GEN_ED_COORDINATOR);
    expect(roles).toHaveLength(8);
  });

  it("marks STUDENT as self_service_internal (requires ACD email)", () => {
    const studentCard = ROLE_CARDS.find((c) => c.role === ROLES.STUDENT);
    expect(studentCard?.category).toBe("self_service_internal");
  });

  it("marks ALUMNI as self_service_external (any Google account accepted)", () => {
    const alumniCard = ROLE_CARDS.find((c) => c.role === ROLES.ALUMNI);
    expect(alumniCard?.category).toBe("self_service_external");
  });

  it("marks INDUSTRY_PARTNER as self_service_external (any Google account accepted)", () => {
    const ipCard = ROLE_CARDS.find((c) => c.role === ROLES.INDUSTRY_PARTNER);
    expect(ipCard?.category).toBe("self_service_external");
  });

  it("marks ADMIN, DEAN, PROGRAM_HEAD as pre_provisioned_admin", () => {
    const adminRoles = [ROLES.SECRETARY, ROLES.DEAN, ROLES.PROGRAM_HEAD];
    for (const role of adminRoles) {
      const card = ROLE_CARDS.find((c) => c.role === role);
      expect(card?.category).toBe("pre_provisioned_admin");
    }
  });

  it("marks FACULTY as self_service_internal", () => {
    const facultyCard = ROLE_CARDS.find((c) => c.role === ROLES.FACULTY);
    expect(facultyCard?.category).toBe("self_service_internal");
  });

  it("includes title and description for every card", () => {
    for (const card of ROLE_CARDS) {
      expect(card.title).toBeTruthy();
      expect(card.description).toBeTruthy();
    }
  });

  describe("OAuth intent generation", () => {
    it("generates correct intent param for STUDENT sign-in", () => {
      const studentCard = ROLE_CARDS.find((c) => c.role === ROLES.STUDENT)!;
      const intentParam = `?intent=${studentCard.role.toLowerCase()}`;
      expect(intentParam).toBe("?intent=student");
    });

    it("generates correct intent param for ALUMNI sign-in", () => {
      const alumniCard = ROLE_CARDS.find((c) => c.role === ROLES.ALUMNI)!;
      const intentParam = `?intent=${alumniCard.role.toLowerCase()}`;
      expect(intentParam).toBe("?intent=alumni");
    });

    it("generates correct intent param for INDUSTRY_PARTNER sign-in", () => {
      const ipCard = ROLE_CARDS.find((c) => c.role === ROLES.INDUSTRY_PARTNER)!;
      const intentParam = `?intent=${ipCard.role.toLowerCase()}`;
      expect(intentParam).toBe("?intent=industry_partner");
    });
  });
});
