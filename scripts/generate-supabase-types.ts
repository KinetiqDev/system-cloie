import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

import { loadEnvConfig } from "@next/env";

import { getSupabaseCommand, requireDirectUrl } from "./supabase-cli";
import { describeCommand, parseTarget } from "./run-supabase-command";
import type { SupabaseTarget } from "./run-supabase-command";

export const OUTPUT_PATH = "src/types/supabase-database.ts";

export function buildTypegenArgs(target: SupabaseTarget, directUrl?: string): string[] {
  if (target === "local") {
    return ["gen", "types", "typescript", "--local", "--schema", "public"];
  }
  if (!directUrl) {
    throw new Error("DIRECT_URL is required before generating remote Supabase types.");
  }
  return ["gen", "types", "typescript", "--db-url", directUrl, "--schema", "public"];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadEnvConfig(process.cwd());
  const target = parseTarget(process.argv[2]);
  const directUrl = target === "remote" ? requireDirectUrl() : undefined;

  console.log(describeCommand(target, "types"));
  const output = execFileSync(getSupabaseCommand(), buildTypegenArgs(target, directUrl), {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${output.trimEnd()}\n`);

  console.log(`Wrote ${OUTPUT_PATH}`);
}
