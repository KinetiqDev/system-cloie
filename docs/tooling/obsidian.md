---
title: Obsidian Vault Conventions
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Obsidian Vault Conventions

The repository root **is** the Obsidian vault. There is no nested vault and no separate vault copy — opening the repository root in Obsidian is the entire setup. Markdown in git is canonical; Obsidian is only a viewer/editor over the working tree. Nothing in this repository depends on Obsidian being installed.

## Link Rules

- **Relative Markdown links only** (`[text](../adr/0011-fallow-code-intelligence-policy.md)`), never `[[wikilinks]]`. Wikilink generation is disabled by convention; the committed docs currently contain no `[[` links, and new ones must not introduce them.
- Obsidian-specific syntax is prohibited in committed documents — no Dataview queries, no embedded custom plugins, no Obsidian-only frontmatter keys. Committed Markdown must render correctly in plain Markdown viewers, GitHub, and editors without Obsidian. The project's frontmatter keys (`title`, `kind`, `status`, `last_verified`, `as_of`, `source_file`, `conversion`) are plain-string YAML, so Obsidian renders them harmlessly as properties.

## Local State

`.obsidian/` holds per-workspace editor state and is **local only** — it is gitignored (`.gitignore`) and also excluded from graphify scanning (`.graphifyignore`). It must never be committed.

## Recommended Settings

Configure Obsidian once per machine (Settings → Files and links):

| Setting                            | Value                                | Why                                                          |
| ---------------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| Vault location                     | Repository root                      | Repo root is the vault; no nested vaults                      |
| New link format                    | Relative path to file                | Relative Markdown links are the project convention            |
| Use `[[Wikilinks]]`                | Off                                  | Wikilinks are prohibited in committed docs                    |
| Automatically update internal links | On                                  | File moves keep links valid during refactors of the docs tree |

Core plugins to enable: **Search**, **Backlinks**, **Outgoing Links**, **Graph**, **Properties**. All of these operate on plain Markdown and add no syntax obligations to committed files. No community plugins are required for any documentation workflow in this repository.

## See Also

- Knowledge-navigation rules for agents: [docs/agents/knowledge-base.md](../agents/knowledge-base.md)
- Domain discovery: [CONTEXT-MAP.md](../../CONTEXT-MAP.md)
- Repository conventions: [AGENTS.md](../../AGENTS.md)
