import { readFileSync } from "node:fs";
import type { FixtureData } from "./global-setup";
import { FIXTURE_DATA_PATH } from "./global-setup";

let cached: FixtureData | null = null;

/** Load the fixture data discovered by the global setup (seeded DB identifiers). */
export function fixture(): FixtureData {
  if (!cached) {
    cached = JSON.parse(readFileSync(FIXTURE_DATA_PATH, "utf8")) as FixtureData;
  }
  return cached;
}
