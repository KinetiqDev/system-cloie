---
title: Capstone Manuscript Snapshot
kind: living-project-document
status: living
last_verified: 2026-09-06
---

# Capstone Manuscript Snapshot

Sync model: Google Docs → repository snapshot → review → Google Docs.

- Google Docs is the collaborative manuscript authority for manuscript content.
- `current.md` is the Markdown snapshot exported from Google Docs; the checked-in
  snapshot is dated 2026-09-06 and predates the accepted GO terminology decision
  in [ADR 0030](../../adr/0030-graduate-outcome-canonical-terminology.md).
- The imported `current.md` and matching DOCX are retained unchanged as a
  source snapshot pending a human Google Docs revision and re-export. They are
  explicitly excluded from the current System CLOIE terminology contract; ADR
  0030 and the numbered living chapter scaffolds govern current terminology.
- New exports replace both files in place; never `v1`, `v2`, `final2`, etc. Git provides the version history.
- `current.md` exists for agent review, repository search, Obsidian, and Graphify. The DOCX is retained as the formatted source snapshot.
- Agents must not rewrite the imported snapshot locally. Accepted revisions are applied manually in Google Docs and arrive here on the next export.
- Formal defense/submission snapshots may later be preserved separately under `docs/_sources/capstone/submissions/`.

The numbered `0X-*.md` chapter files alongside this README are separate working scaffolds; this README governs only the Google Docs snapshot (`current.md` plus its DOCX).
