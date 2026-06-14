# Muse Studio — Environment Feature Handoff

## 1. Goal

The Environment feature mirrors the Character feature in Muse Studio.
It allows users to define recurring locations/settings for a film project, attach reference images, and write visual prompts for AI generation.
The data model, server actions, navigation button, and a first version of the page client are already implemented.
The immediate goal is to stabilize and validate the existing Environment page before adding anything new.

---

## 2. Current branch and workflow

- **Branch:** `feature/environment`
- Work in atomic steps: **maximum 1–2 files per task**
- Always check `git status` / `git diff` before committing
- Never modify files that are not explicitly listed as allowed for the current task
- Never commit without user approval

---

## 3. Already implemented

| What | Files |
|---|---|
| Environment TypeScript types (`EnvironmentImageKind`, `EnvironmentImageSource`, `EnvironmentImage`, `Environment`) | `muse-studio/lib/types.ts` |
| DB schema (`environments`, `environment_images`, `scene_environments` tables) | `muse-studio/db/index.ts` |
| Server actions (`listEnvironments`, `createEnvironment`, `updateEnvironment`, `deleteEnvironment`, `addEnvironmentImage`, `deleteEnvironmentImage`) | `muse-studio/lib/actions/environments.ts` |
| Navigation button (links to `/projects/[id]/environments`, icon `MapPin`) | `muse-studio/components/environments/ProjectEnvironmentsButton.tsx` |
| Button added to project page | `muse-studio/app/projects/[id]/page.tsx` |
| Environments route (Server Component, loads project + environments, renders `EnvironmentsPageClient`) | `muse-studio/app/projects/[id]/environments/page.tsx` |
| First version of page client (sidebar by type, create form, detail view, upload, delete) | `muse-studio/components/environments/EnvironmentsPageClient.tsx` |

---

## 4. Current immediate task

- **Stabilize and test the existing Environment page**
- Fix only build errors, runtime errors, or obvious UI regressions
- Do not add new features until the page is validated by the user
- The page is accessible at `/projects/[id]/environments`

---

## 5. Files allowed for immediate fixes

Only touch these two files unless the error is explicitly caused by another file:

- `muse-studio/components/environments/EnvironmentsPageClient.tsx`
- `muse-studio/app/projects/[id]/environments/page.tsx`

All other files are **read-only** unless the user explicitly authorizes a change.

---

## 6. Important existing files (read only if needed)

- `muse-studio/components/characters/CharactersPageClient.tsx` — reference mirror
- `muse-studio/app/projects/[id]/characters/page.tsx` — reference mirror
- `muse-studio/lib/actions/environments.ts` — server actions
- `muse-studio/lib/types.ts` — Environment types
- `muse-studio/db/index.ts` — DB schema
- `muse-studio/components/media/ManualImageUploadButton.tsx` — upload component

---

## 7. Do not do

- Do not restart the implementation from scratch
- Do not modify Character files
- Do not modify DB / types / actions unless the error explicitly requires it
- Do not add `EnvironmentSheetDialog` yet
- Do not add `EnvironmentComfyGenerateDialog` yet
- Do not implement Scene ↔ Environment linking yet
- Do not scan the entire repository
- Do not run terminal commands without asking the user first
- Do not commit without user approval

---

## 8. Next planned steps

1. Test and fix `EnvironmentsPageClient` (stabilization)
2. Commit stable Environment management page
3. *(Optional later)* Add `EnvironmentSheetDialog`
4. *(Optional later)* Add `EnvironmentComfyGenerateDialog`
5. *(Optional much later)* Add Scene ↔ Environment linking

---

## 9. Prompt for cheaper model

Copy-paste this prompt to start a new Cline session with a cheaper model:

```
You are continuing an in-progress feature called "Environment" in the Muse Studio project.

Before doing anything:
1. Read the file ENVIRONMENT_MODEL_HANDOFF.md carefully.
2. Do not read the entire repository.
3. Wait for a specific error report or a precise instruction from the user.

Rules:
- Make the smallest possible change to fix the reported issue.
- Only modify files listed in section 5 of the handoff, unless the user explicitly authorizes another file.
- Do not create new files unless instructed.
- Do not delete files.
- Do not run any terminal command without asking the user first.
- Do not commit anything.
- Do not restart the implementation from scratch.
- Do not add EnvironmentSheetDialog, EnvironmentComfyGenerateDialog, or Scene↔Environment linking.

When ready, tell the user: "I have read the handoff. Please describe the error or the change you need."