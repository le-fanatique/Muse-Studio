# CLAUDE.md

## Project

**Repository:** Muse Studio Fork — `F:/AI/muse-studio-fork`
**Branch:** feature/environment

Personal fork of Muse Studio focused on production-oriented AI workflows, ComfyUI integration, Environment generation, and future studio pipeline integrations.

---

# Working Rules

Always start in Audit / Plan mode before modifying code. Never modify files until an implementation plan has been reviewed and approved.

Observed cycle on this branch (B1–B5, repeat for future lettered steps):
1. Read-only audit, scoped to specific questions
2. Plan-only pass, written to the plan file, no code touched
3. Implementation pass with an explicit file allowlist ("ne touche à aucun autre fichier")
4. `git status --short` + `git diff --stat` shown after every implementation
5. No commit unless explicitly requested

Always minimize the number of modified files. Prefer additive changes over refactors. Avoid new dependencies unless explicitly approved. Avoid new DB tables/columns unless necessary.

---

# Repository Knowledge

## Frontend — `muse-studio/`
Next.js (App Router, server actions) + React + TypeScript.

## Backend — `muse_backend/`
FastAPI + Python.
- ComfyUI client: `app/comfyui_runner.py`
- Generation routes: `app/api/routes/generate.py`

## Database (SQLite, `muse-studio/db/index.ts`)
- `settings` — key/value app config (`comfyui_base_url`, `comfyui_api_key_enc`, LLM/inference settings)
- `environments`, `environment_images`, `scene_environments` — Environment feature
- `plugins`, `plugin_endpoints`, `plugin_hooks`, `plugin_ui_extensions`, `plugin_settings` — MCP Extensions
- `comfy_workflows` — registered ComfyUI workflow JSONs

No `encrypted` column convention — encryption is handled at the application layer only (see B5).

---

# ComfyUI Configuration

**Architecture (never break this):**
Browser → Next.js API route (`app/api/generate/comfyui/route.ts`) → FastAPI (`generate.py`) → `ComfyUIRunner` → ComfyUI instance.
The browser must never call ComfyUI directly; base_url/api_key resolution is always server-side.

Completed:
- **B1** Configurable ComfyUI Base URL (DB → request → ENV → `http://127.0.0.1:8188`)
- **B2** Docker secret cleanup (no hardcoded keys in `docker-compose.yml`)
- **B3** Connection Test (`POST /generate/comfyui/test` → `GET {url}/system_stats`)
- **B4** Diagnostics (version, OS, device, GPU, VRAM used/total)
- **B5** Encrypted ComfyUI API Key — AES-256-GCM via `node:crypto`, stored in `settings.comfyui_api_key_enc`, implementation in `lib/comfyui-crypto.ts`, encryption key in `COMFYUI_ENCRYPTION_KEY` (`.env.local`). Fallback chain: DB (decrypted) → ENV `COMFYUI_API_KEY` → none.

⚠️ If `COMFYUI_ENCRYPTION_KEY` is lost or changed, the stored key becomes permanently undecryptable — no recovery, user must clear and re-enter.

Never expose, display, or log API key values (encrypted or decrypted).

---

# Environment Feature

Status: functional MVP, validated end-to-end (see `ENVIRONMENT_MODEL_HANDOFF.md`).
Counterpart of Character, but for recurring locations/sets instead of people.

- Data model: `lib/types.ts`, server actions in `lib/actions/environments.ts`
- UI: `app/projects/[id]/environments/` + `components/environments/`
- Reuses the existing ComfyUI generation flow and the `visual_keyframe_prompt` task (shared with Character — see B6)

Not yet wired up: linking Environments to Scenes (`scene_environments` table exists, no UI yet).

---

# MCP Extensions System

Muse Studio acts as an MCP client. Two server kinds supported: legacy HTTP plugin (`/plugin.manifest.json`) and MCP Streamable HTTP (`POST /mcp`).

- Canonical UI: `app/settings/extensions/page.tsx` (`/settings/mcp-extensions` is a redirect alias — keep it)
- Server actions: `lib/actions/plugins.ts`
- Manifest schema: `lib/plugin-extension/manifest.ts`

---

# Sensitive Areas

- `muse_backend/app/comfyui_runner.py` — shared with upstream Muse Studio; changes here risk breaking upstream compatibility. Keep the `os.getenv("COMFYUI_API_KEY")` fallback in `__post_init__`.
- `lib/actions/settings.ts: getAllSettings()` — must never return `comfyui_api_key_enc` (or any future `*_enc` key) unfiltered.
- `docker-compose.yml` — never hardcode secrets; use `env_file` only.

---

# Known Pitfalls

- Numeric fields from ComfyUI's `/system_stats` (VRAM, etc.) vary across versions — always `isinstance(x, (int, float)) and x > 0` before use.
- `lib/comfyui-crypto.ts` imports `db` directly, not `getSetting` from `settings.ts`, to avoid a circular import (`settings.ts` → `comfyui-crypto.ts` → `settings.ts`).
- Any new sensitive key added to the `settings` table must be explicitly filtered out of `getAllSettings()`.

---

# Current Backlog

## B6 — Character Muse Prompt (not started)

Character and Environment both currently reuse the same task `visual_keyframe_prompt`.
Goal: create a dedicated `character_visual_prompt` in `lib/generation/storyGenerationInternals.ts` without modifying `visual_keyframe_prompt` (Environment depends on it).

---

# LangGraph Notes

LangGraph exists in the repo but is not configured for LangGraph Studio. Graphs: `suggestion_agent.py`, `longform_scene_agent.py`, `supervisor_graph.py`, `video_editor_agent.py`.

Character/Scene/Environment description generation does **not** use LangGraph — it calls the LLM directly via `/api/generate/story` (`useStoryMuse` hook). Prompts live in `lib/generation/storyGenerationInternals.ts`.

---

# Preferred Development Style

Prefer: small isolated commits, minimal diffs, backward compatibility, existing project patterns.
Avoid: large refactors, DB schema changes unless necessary, new infrastructure/services.

---

# Before Any Code Change

Always provide: summary, files impacted, risks, compatibility considerations, implementation order. No code modifications before approval.

---

# Commit Style

Preferred: `Add ...`, `Improve ...`, `Fix ...`, `Update ...`, `Show ...`. Avoid: `WIP`, `misc changes`, `update stuff`.
Verified against the last 25 commits on this branch — followed with no exceptions.

---

# Long Term Vision

The fork is evolving toward: Environment/Character workflows, studio-oriented AI pipelines, ComfyUI production integration, MCP extension discovery/marketplace, asset traceability, reusable AI generation workflows.

Maintain compatibility with upstream Muse Studio whenever practical.
