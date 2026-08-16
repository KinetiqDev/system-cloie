---
name: grilling
description: Grill the user relentlessly about implementation and spec gaps in a plan or design. Use when the user wants to stress-test a plan before building, or uses any 'grill' trigger phrases.
---

Interview me relentlessly about the **gaps** in this plan until we reach a shared understanding or the budget is spent. Walk the high-stakes branches of the design tree, resolving dependencies between decisions.

## Waves

Ask questions in **waves of 10**. One wave per turn. Wait for answers to the current wave before asking the next.

**Budget: 4 waves (40 questions) maximum.** Before each wave, rank remaining gaps and ask the top 10:

1. **Blockers** — immediate clarifications that would stall or misdirect implementation
2. **Spec gaps** — ambiguities that would leave the spec weak or underspecified

If blockers or spec gaps remain and budget remains, fire another wave. If none remain, stop and ask me to confirm shared understanding. After wave 4, list leftover gaps and wait for me to confirm we proceed with them open. A wave may be shorter than 10 when fewer gaps are left — never pad with filler.

Carry unresolved branches into later waves; do not re-ask a settled decision.

## Dual phrasing

Every question has both versions, then a recommendation:

1. **Technical** — precise, domain terms, constraints, APIs, invariants.
2. **Layman** — the same decision and an example, both in plain language, no jargon.
3. **Recommended** — your answer and why, in one or two sentences.

Number questions 1–10 inside the wave.

## Facts vs decisions

If a *fact* can be found by exploring the codebase, look it up rather than asking me. The *decisions* are mine — put each one to me in a wave and wait for my answers.

Do not enact the plan until I confirm we have reached a shared understanding.
