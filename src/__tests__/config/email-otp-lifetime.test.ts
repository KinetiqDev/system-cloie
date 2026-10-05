import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("email code lifetime", () => {
  it("declares the same ten-minute window for the local stack and self-hosted targets", () => {
    const config = readFileSync(path.join(process.cwd(), "supabase/config.toml"), "utf8");
    const mailEnv = readFileSync(path.join(process.cwd(), "supabase/mail.env.example"), "utf8");
    const sectionStart = config.indexOf("[auth.email]");
    expect(
      sectionStart,
      "the local stack must declare its email configuration"
    ).toBeGreaterThanOrEqual(0);
    const remainingConfig = config.slice(sectionStart + "[auth.email]".length);
    const nextSection = remainingConfig.search(/^\[/m);
    const emailSection = nextSection < 0 ? remainingConfig : remainingConfig.slice(0, nextSection);
    const localValue = emailSection.match(/^otp_expiry\s*=\s*(\d+)\s*$/m)?.[1];
    const selfHostedValue = mailEnv.match(/^MAILER_OTP_EXP\s*=\s*"(\d+)"\s*$/m)?.[1];

    expect(localValue, "the local stack must declare an email code lifetime").toBeDefined();
    expect(
      selfHostedValue,
      "self-hosted targets must declare an email code lifetime"
    ).toBeDefined();
    expect(
      Number(localValue),
      "the local stack and self-hosted targets must declare the same code lifetime"
    ).toBe(Number(selfHostedValue));
    expect(Number(localValue), "email codes must expire after ten minutes").toBe(600);
  });
});
