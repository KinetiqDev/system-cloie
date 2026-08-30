import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { loadEnvConfig } from "@next/env";

import { getSupabaseCommand, requireDirectUrl } from "./supabase-cli";

export type SupabaseTarget = "local" | "remote";

export function parseTarget(raw: string | undefined): SupabaseTarget {
  if (raw === "local" || raw === "remote") return raw;
  throw new Error(
    "Usage: tsx scripts/run-supabase-command.ts <local|remote> <command> [flags...]\n" +
      "  local  commands: start, stop, status, reset, migration-list\n" +
      "  remote commands: migration-list, push\n" +
      "Pass 'init' as the first argument to run `supabase init`."
  );
}

export function buildLocalCommandArgs(command: string): string[] {
  switch (command) {
    case "start":
      return ["start"];
    case "stop":
      return ["stop"];
    case "status":
      return ["status"];
    case "reset":
      return ["db", "reset", "--local", "--yes"];
    case "migration-list":
      return ["migration", "list", "--local"];
    default:
      throw new Error(
        `Unsupported local command: ${command}. Supported: start, stop, status, reset, migration-list`
      );
  }
}

export function buildRemoteCommandArgs(
  command: string,
  directUrl: string,
  extraArgs: string[] = []
): string[] {
  switch (command) {
    case "migration-list":
      return ["migration", "list", "--db-url", directUrl];
    case "push":
      return ["db", "push", "--db-url", directUrl, ...extraArgs];
    default:
      throw new Error(`Unsupported remote command: ${command}. Supported: migration-list, push`);
  }
}

export function describeCommand(target: SupabaseTarget, command: string): string {
  if (target === "local") {
    return `Supabase CLI: local ${command}`;
  }
  return `Supabase CLI: remote ${command} (DIRECT_URL target)`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadEnvConfig(process.cwd());

  const [targetArg, command, ...extraArgs] = process.argv.slice(2);

  let target: SupabaseTarget;
  let args: string[];

  if (targetArg === "init") {
    target = "local";
    args = ["init"];
    console.log(describeCommand(target, "init"));
  } else {
    target = parseTarget(targetArg);
    args =
      target === "local"
        ? buildLocalCommandArgs(command)
        : buildRemoteCommandArgs(command, requireDirectUrl(), extraArgs);
    console.log(describeCommand(target, command));
  }

  execFileSync(getSupabaseCommand(), args, {
    shell: process.platform === "win32",
    stdio: "inherit",
  });
}
