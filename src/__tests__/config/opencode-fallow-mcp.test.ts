import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const OPENCODE_CONFIG_PATH = join(ROOT, "opencode.json");
const MCP_TIMEOUT_MS = 30_000;

const EXPECTED_TOOLS = [
  "analyze",
  "audit",
  "check_changed",
  "check_health",
  "check_runtime_coverage",
  "feature_flags",
  "find_dupes",
  "fix_apply",
  "fix_preview",
  "list_boundaries",
  "project_info",
  "trace_clone",
  "trace_dependency",
  "trace_export",
  "trace_file",
] as const;

interface McpServerConfig {
  type?: string;
  command?: string[];
  enabled?: boolean;
  url?: string;
  headers?: unknown;
}

interface Handshake {
  serverInfo: { name: string; version: string; description: string };
  protocolVersion: string;
  instructions: string;
  tools: string[];
}

async function startFallowMcp(): Promise<Handshake> {
  const child = spawn("pnpm", ["exec", "fallow-mcp"], { stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: child.stdout });

  const waiters = new Map<number, (response: Record<string, unknown>) => void>();
  const drain = (async () => {
    for await (const line of lines) {
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (typeof parsed.id === "number") {
        const resolve = waiters.get(parsed.id);
        if (resolve) {
          waiters.delete(parsed.id);
          resolve(parsed);
        }
      }
    }
  })();

  const send = (id: number, method: string, params?: unknown): Promise<Record<string, unknown>> => {
    const frame = {
      jsonrpc: "2.0",
      id,
      method,
      ...(params === undefined ? {} : { params }),
    };
    return new Promise((resolve, reject) => {
      child.stdin.write(`${JSON.stringify(frame)}\n`, (error) => {
        if (error) reject(error);
      });
      waiters.set(id, resolve);
    });
  };

  const initialize = await send(1, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "vitest", version: "0" },
  });
  expect(initialize.jsonrpc).toBe("2.0");
  expect(initialize.error).toBeUndefined();

  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

  const tools = await send(2, "tools/list");
  expect(tools.jsonrpc).toBe("2.0");
  expect(tools.error).toBeUndefined();

  child.stdin.end();
  await drain;
  await new Promise<void>((resolve) => child.once("close", () => resolve()));

  const result = initialize.result as {
    protocolVersion?: string;
    serverInfo?: { name: string; version: string; description: string };
    instructions?: string;
  };
  const toolsResult = tools.result as { tools?: Array<{ name: string }> };

  expect(result.serverInfo).toBeDefined();
  expect(result.protocolVersion).toBeDefined();
  expect(toolsResult.tools).toBeDefined();

  return {
    serverInfo: result.serverInfo!,
    protocolVersion: result.protocolVersion!,
    instructions: result.instructions ?? "",
    tools: (toolsResult.tools ?? []).map((tool) => tool.name),
  };
}

describe("root opencode.json declares the project-local fallow-mcp server", () => {
  let config: Record<string, unknown>;
  let server: McpServerConfig;

  it("exists and declares the published schema", () => {
    config = JSON.parse(readFileSync(OPENCODE_CONFIG_PATH, "utf8")) as Record<
      string,
      unknown
    >;
    expect(config.$schema).toBe("https://opencode.ai/config.json");
  });

  it("declares exactly the fallow local MCP server", () => {
    expect(Object.keys(config).sort()).toEqual(["$schema", "mcp"]);
    expect(Object.keys(config.mcp as Record<string, unknown>).sort()).toEqual(["fallow"]);
    server = (config.mcp as Record<string, McpServerConfig>).fallow;
    expect(server).toBeDefined();
  });

  it("serves fallow over the documented pnpm exec command", () => {
    expect(server.type).toBe("local");
    expect(server.command).toEqual(["pnpm", "exec", "fallow-mcp"]);
    expect(server.enabled).not.toBe(false);
    for (const remoteKey of ["url", "headers"] as const) {
      expect(server).not.toHaveProperty(remoteKey);
    }
  });
});

describe("fallow-mcp handshake over the documented command", () => {
  it(
    "negotiates the current protocol and reports the pinned server identity",
    async () => {
      const handshake = await startFallowMcp();
      expect(handshake.protocolVersion).toBe("2024-11-05");
      expect(handshake.serverInfo).toEqual({
        name: "fallow-mcp",
        version: "2.54.3",
        description: "Codebase analysis for TypeScript/JavaScript projects",
      });
      expect(handshake.instructions.length).toBeGreaterThan(0);
    },
    MCP_TIMEOUT_MS,
  );

  it(
    "serves the pinned 2.54.3 tool inventory",
    async () => {
      const handshake = await startFallowMcp();
      expect([...handshake.tools].sort()).toEqual([...EXPECTED_TOOLS].sort());
      expect(handshake.tools).toHaveLength(EXPECTED_TOOLS.length);
    },
    MCP_TIMEOUT_MS,
  );
});
