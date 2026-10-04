# PR body

Merged pull requests in this repository open with the same four sections. A reviewer reads **Changes** to learn what shipped and **Verification** to decide whether to believe it. Write both from commands that ran, not from what was intended.

## Skeleton

```markdown
Closes #<N>

## Changes

<What shipped and why, in behavior terms. Bullets, not a diff narration.>

<Scope boundaries when they are true: "No schema migrations or dependency changes.">

## Review fixes

- <One bullet per accepted finding: what was raised, what changed.>

## Verification

Head: <full SHA of the head this evidence describes>

- <command> — <result with counts: "4,151 passed, 7 skipped">
- <PR gate> — <outcome on that head>
- No CI gate, timeout, retry, baseline, or assertion tolerance was changed.

## Release boundaries

<What this PR cannot prove — deployed configuration, SMTP and sending domains, institutional approval, real provider authentication — and where that evidence lives instead.>
```

Omit a section that would carry no fact. Every section that is present carries weight.

## Changes

Behavior and intent, in the reader's terms. Name the invariants the change preserved — server authorization, program and course scope, response confidentiality, one-response and finalization rules — because those are what a reviewer checks first. State scope boundaries plainly when they hold: no migrations, no dependency changes, no out-of-scope cleanup riding along.

## Review fixes

One bullet per accepted finding: what was raised, what changed. A rejection or deferral gets its reason — incorrect, explicitly required, out of scope, or owned by another ticket. This section is what tells the second reader that review changed something, so an empty list belongs in the report as "no findings", not in the body as a heading.

## Verification

The section that decides trust.

- **Lead with the full head SHA.** Evidence describes one commit; any later push invalidates it and the numbers need re-running.
- **Quote counts, not adjectives.** "4,151 passed, 7 explicitly skipped" beats "tests pass".
- **Name the gates that ran and the ones risk selection skipped**, with the domain that selected them. A skipped gate is the selector working; showing it proves you read the matrix instead of assuming.
- **Database evidence:** disposable target, suite counts, and preflight numbers for a migration.
- **Browser evidence:** journeys passed, retries disabled, viewports covered, fixture identities pinned in `e2e/support/contract.ts`.
- **State the negatives.** "No Fallow suppressions or baseline refresh were used", "no tolerance, retry, CI gate, or accessibility assertion was weakened". This is the line that tells a reviewer the run was honest, and it is only true if it is true.

Accepted production evidence follows `docs/testing/production-browser-evidence.md`.

## The Greptile block

Greptile appends its own section to the body, after everything written here, delimited by `<!-- greptile_comment -->` and `<!-- /greptile_comment -->`. It carries the confidence score and the clear-to-merge statement.

Write above that block and leave it exactly as Greptile wrote it. The verdict is the second merge gate: while the body records less than 5/5, or records a verdict for an older head, the review is unfinished. `SKILL.md` step 5 owns the loop that closes it.

## Release boundaries

Merge-ready is not release-ready, and a PR cannot prove a deployed fact: production SMTP and sending domains, deployed Auth settings, institutional and legal approval, a policy a human decided. Name each as release evidence required elsewhere, with the runbook that collects it. Short sentences — the point is to stop a green PR from being read as "shipped".
