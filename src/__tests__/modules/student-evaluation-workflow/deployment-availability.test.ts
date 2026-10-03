import { DeploymentStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { isDeploymentAvailable } from "@/features/responses/services/deployment-availability";

describe("isDeploymentAvailable", () => {
  it("keeps scheduled evaluations unavailable before activation", () => {
    expect(
      isDeploymentAvailable(
        {
          activation_at: new Date("2026-05-15T00:00:00.000Z"),
          deadline_at: new Date("2026-05-20T00:00:00.000Z"),
          status: "SCHEDULED",
        },
        new Date("2026-05-10T00:00:00.000Z")
      )
    ).toBe(false);
  });

  it("treats scheduled evaluations as available once activation passes", () => {
    expect(
      isDeploymentAvailable(
        {
          activation_at: new Date("2026-05-15T00:00:00.000Z"),
          deadline_at: new Date("2026-05-20T00:00:00.000Z"),
          status: "SCHEDULED",
        },
        new Date("2026-05-16T00:00:00.000Z")
      )
    ).toBe(true);
  });

  it("keeps inactive evaluations unavailable even after activation", () => {
    expect(
      isDeploymentAvailable(
        {
          activation_at: new Date("2026-05-01T00:00:00.000Z"),
          deadline_at: new Date("2026-05-20T00:00:00.000Z"),
          status: DeploymentStatus.CLOSED,
        },
        new Date("2026-05-16T00:00:00.000Z")
      )
    ).toBe(false);
  });

  it("keeps expired evaluations unavailable", () => {
    expect(
      isDeploymentAvailable(
        {
          activation_at: new Date("2026-05-01T00:00:00.000Z"),
          deadline_at: new Date("2026-05-10T00:00:00.000Z"),
          status: "ACTIVE",
        },
        new Date("2026-05-16T00:00:00.000Z")
      )
    ).toBe(false);
  });
});
