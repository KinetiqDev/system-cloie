import { describe, expect, it, vi } from "vitest";
import {
  AiInsightCache,
  buildAiInsightCacheKey,
  buildEvidenceBoundedUserMessage,
  requestAiJsonOutput,
  type AiModelTransport,
} from "@/features/analytics/services/ai-insight-runtime";
import {
  AI_EVIDENCE_END,
  AI_EVIDENCE_START,
} from "@/features/analytics/services/program-head-ai-schema";

type Result = { ok: boolean; value: string };

const RESULT = (value: string): Result => ({ ok: true, value });

describe("buildAiInsightCacheKey", () => {
  it("changes with every input that can change the interpretation", () => {
    const base = ["prompt-v1", "user-1", "outcomes", "model", "https://provider/v1", "{}"];

    expect(buildAiInsightCacheKey(base)).toBe(buildAiInsightCacheKey([...base]));
    for (let index = 0; index < base.length; index += 1) {
      const changed = [...base];
      changed[index] = `${changed[index]}-changed`;
      expect(buildAiInsightCacheKey(changed)).not.toBe(buildAiInsightCacheKey(base));
    }
  });

  it("cannot be confused by a separator collision between adjacent inputs", () => {
    expect(buildAiInsightCacheKey(["ab", "c"])).not.toBe(buildAiInsightCacheKey(["a", "bc"]));
  });
});

describe("buildEvidenceBoundedUserMessage", () => {
  it("wraps the packet between the fixed markers exactly once", () => {
    const message = buildEvidenceBoundedUserMessage("Interpret this evidence.", '{"a":1}');

    expect(message.indexOf(AI_EVIDENCE_START)).toBe(message.lastIndexOf(AI_EVIDENCE_START));
    expect(message.indexOf(AI_EVIDENCE_END)).toBe(message.lastIndexOf(AI_EVIDENCE_END));
    expect(
      message
        .slice(
          message.indexOf(AI_EVIDENCE_START) + AI_EVIDENCE_START.length,
          message.lastIndexOf(AI_EVIDENCE_END)
        )
        .trim()
    ).toBe('{"a":1}');
  });
});

describe("AiInsightCache", () => {
  it("reuses one validated result for concurrent identical requests", async () => {
    const cache = new AiInsightCache<Result>();
    const generate = vi.fn(async () => RESULT("first"));

    const [left, right] = await Promise.all([
      cache.runOnce("key", generate),
      cache.runOnce("key", generate),
    ]);

    expect(left).toEqual(right);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("never caches a failed generation and lets the retry run again", async () => {
    const cache = new AiInsightCache<Result>();
    const failed = vi.fn(async () => ({ ok: false, value: "error" }));

    await cache.runOnce("key", failed);
    await cache.runOnce("key", failed);

    expect(failed).toHaveBeenCalledTimes(2);
    expect(cache.get("key")).toBeNull();
  });

  it("evicts the least recently used entry once the bound is exceeded", async () => {
    const cache = new AiInsightCache<Result>(2);
    cache.set("a", RESULT("a"));
    cache.set("b", RESULT("b"));
    cache.get("a");
    cache.set("c", RESULT("c"));

    expect(cache.get("b")).toBeNull();
    expect(cache.get("a")?.value).toBe("a");
    expect(cache.get("c")?.value).toBe("c");
    expect(cache.size).toBe(2);
  });

  it("serves an exact evidence state but never a different one", () => {
    const cache = new AiInsightCache<Result>();
    cache.set(buildAiInsightCacheKey(["v1", "user", "outcomes", "packet-a"]), RESULT("a"));

    expect(cache.get(buildAiInsightCacheKey(["v1", "user", "outcomes", "packet-a"]))?.value).toBe(
      "a"
    );
    expect(cache.get(buildAiInsightCacheKey(["v1", "user", "trends", "packet-a"]))).toBeNull();
    expect(cache.get(buildAiInsightCacheKey(["v1", "other", "outcomes", "packet-a"]))).toBeNull();
  });
});

describe("requestAiJsonOutput", () => {
  const okTransport = (content: string) =>
    vi.fn<AiModelTransport>(async () => ({ ok: true as const, content }));

  it("extracts JSON fenced in markdown and returns the parsed value", async () => {
    const output = await requestAiJsonOutput(okTransport('```json\n{"a":1}\n```'), {
      model: "m",
      systemInstruction: "s",
      userMessage: "u",
      responseFormat: { type: "json_object" },
    });

    expect(output).toEqual({ ok: true, value: { a: 1 } });
  });

  it("rejects output beyond the hard character bound instead of parsing it", async () => {
    const output = await requestAiJsonOutput(okTransport("x".repeat(12_001)), {
      model: "m",
      systemInstruction: "s",
      userMessage: "u",
      responseFormat: { type: "json_object" },
    });

    expect(output).toEqual({ ok: false, state: "invalid-output" });
  });

  it("maps a provider timeout and a provider failure to distinct states", async () => {
    const timedOut = await requestAiJsonOutput(
      vi.fn<AiModelTransport>(async () => ({ ok: false, timedOut: true })),
      {
        model: "m",
        systemInstruction: "s",
        userMessage: "u",
        responseFormat: { type: "json_object" },
      }
    );
    const failed = await requestAiJsonOutput(
      vi.fn<AiModelTransport>(async () => ({ ok: false, timedOut: false })),
      {
        model: "m",
        systemInstruction: "s",
        userMessage: "u",
        responseFormat: { type: "json_object" },
      }
    );

    expect(timedOut).toEqual({ ok: false, state: "timeout" });
    expect(failed).toEqual({ ok: false, state: "provider-error" });
  });
});
