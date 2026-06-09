# TODO-1592: README polish with UI screenshot hero

## Shipped

- Restructured root `README.md` for visitor-first layout: hook, hero screenshots, feature bullets, privacy, UI-first quick start.
- Added sanitized UI assets under `docs/assets/readme/`:
  - `message-search-resume.png` — message search with resume command popup
  - `conversation-modal.png` — conversation viewer modal
- Moved provider hook table and `workspace.json` detail out of the first screen; linked to `docs/technical/session-sources.md` and provider-readiness change note.
- CLI demoted to brief mention + `README.cli.md` link (no `README.cli.md` rewrite).

## Acceptance criteria

| AC | Status |
|----|--------|
| AC1 Hero screenshot | Done — `message-search-resume.png` |
| AC2 Visitor-friendly intro | Done |
| AC3 UI-first features | Done |
| AC4 Quick start leads with UI | Done |
| AC5 Trust signals | Done — Why + Privacy retained |
| AC6 Relocate technical depth | Done — Extending section + links |
| AC7 Sanitized assets | Done — session UUIDs sanitized in captures |
| AC8 Captions | Done — alt text + italic captions |

## Out of scope (unchanged)

- `README.cli.md` full rewrite
- GIF / social preview image
- npm publish
