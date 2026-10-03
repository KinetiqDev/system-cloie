import { describe, expect, it } from "vitest";

import { buildStartArgs, parseStackEndpoints } from "../../../scripts/ci/run-auth-integration";

/**
 * Real Auth gate runner contract (issue #649).
 *
 * `parseStackEndpoints` decides both which endpoints the mutating suite runs
 * against and whether the runner started the stack it later stops. Getting it
 * wrong has real consequences: reading the pretty-printed `status -o json`
 * shape as unparseable made the runner believe it owned a developer's running
 * stack and stop it. Both the output shapes and the ownership decision are
 * pinned here.
 */
const ENDPOINTS = {
  API_URL: "http://127.0.0.1:54321",
  MAILPIT_URL: "http://127.0.0.1:54324",
  ANON_KEY: "anon-key",
  SERVICE_ROLE_KEY: "service-key",
};

describe("auth integration runner (649)", () => {
  it("reads the single-line object the CLI prints after start and stop", () => {
    const output = [
      "WARN: config section [inbucket] is deprecated.",
      "A new version of Supabase CLI is available.",
      JSON.stringify(ENDPOINTS),
    ].join("\n");

    expect(parseStackEndpoints(output)).toEqual({
      apiUrl: "http://127.0.0.1:54321",
      anonKey: "anon-key",
      serviceKey: "service-key",
      mailUrl: "http://127.0.0.1:54324",
    });
  });

  it("reads the pretty-printed object `status -o json` prints", () => {
    const pretty = JSON.stringify(ENDPOINTS, null, 2);
    const output = ["supabase_db_project-cloie container is not ready: starting", pretty].join(
      "\n"
    );

    expect(parseStackEndpoints(output)).toEqual({
      apiUrl: "http://127.0.0.1:54321",
      anonKey: "anon-key",
      serviceKey: "service-key",
      mailUrl: "http://127.0.0.1:54324",
    });
  });

  it("falls back to the newer publishable and secret keys", () => {
    const endpoints = parseStackEndpoints(
      JSON.stringify({
        API_URL: "http://127.0.0.1:54321",
        INBUCKET_URL: "http://127.0.0.1:54324",
        PUBLISHABLE_KEY: "publishable",
        SECRET_KEY: "secret",
      })
    );

    expect(endpoints).toEqual({
      apiUrl: "http://127.0.0.1:54321",
      anonKey: "publishable",
      serviceKey: "secret",
      mailUrl: "http://127.0.0.1:54324",
    });
  });

  it("reports no endpoints when the stack is down or the output is unparseable", () => {
    expect(parseStackEndpoints("")).toBeNull();
    expect(parseStackEndpoints("CLI failed to start")).toBeNull();
    // A partial object must not resolve to a usable endpoint set.
    expect(parseStackEndpoints('{"API_URL": "http://127.0.0.1:54321"}')).toBeNull();
  });

  it("excludes the services the auth gate never exercises", () => {
    const args = buildStartArgs();
    expect(args[0]).toBe("start");
    expect(args[1]).toBe("-x");
    const excluded = new Set((args[2] ?? "").split(","));
    // Auth, the database, and the mail catcher must stay running.
    expect(excluded.has("gotrue")).toBe(false);
    expect(excluded.has("postgres")).toBe(false);
    expect(excluded.has("mailpit")).toBe(false);
    expect(excluded.has("studio")).toBe(true);
  });
});
