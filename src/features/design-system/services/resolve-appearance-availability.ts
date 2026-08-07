import { DEMO_DEPLOYMENT_KIND, getDemoAuthConfig } from "@/features/auth/services/demo-auth";

const APPEARANCE_RELEASE_SETTING = "CLOIE_APPEARANCE_ENABLED";

export function resolveAppearanceAvailability(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  if (process.env.CLOIE_DEPLOYMENT_KIND === DEMO_DEPLOYMENT_KIND) {
    return getDemoAuthConfig() !== null;
  }

  return process.env[APPEARANCE_RELEASE_SETTING] === "true";
}
