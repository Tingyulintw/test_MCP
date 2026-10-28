# hello-mcp-server

A tiny, zero-dependency demo MCP server (stdio). Good for learning how MCP marketplaces read a repo.

## Tools

- `roll_dice` — roll `count` dice with `sides` sides
- `word_count` — words / characters / lines of a text
- `release_notes_template` — Markdown release-notes skeleton

## Prompt

- `write_release_notes` — "write the release notes for this milestone"

## Run

```bash
node index.js
```

## Files a marketplace looks for

`server.json` at the repo root (a copy is also in `.well-known/mcp/server.json`).
