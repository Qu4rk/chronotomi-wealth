# Chronotomi — Agent Guidelines

Chronotomi is a luxury watch advisory and curation web application built with vanilla HTML5, CSS3, and JavaScript, backed by a static product catalog in `watches.json`.

## Key Files & Architecture
- `index.html`: Main landing and showcase page.
- `advisory.html`, `logistics.html`, `about.html`: Primary content pages.
- `manage.html`, `manage.js`: Inventory management interface.
- `watches.json`, `watches.js`: Catalog data and data helper routines.
- `script.js`, `styles.css`: Core interactivity, animations, and global styling.

## Goal Orchestration (MANDATORY)

Whenever `/goal` or complex multi-step engineering tasks are requested:
1. You MUST activate and strictly follow the `flash-3-7-high-subagent-orchestrator` skill.
2. The parent agent MUST NOT perform code implementation directly.
3. The parent agent MUST immediately decompose the work into 2-4 distinct specialist missions and launch them concurrently via `invoke_subagent`.
4. The parent agent's role is strictly: Architecture -> `invoke_subagent` -> Review & Integration -> Final Validation.
