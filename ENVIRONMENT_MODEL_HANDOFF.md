# Muse Studio — Environment Feature Handoff

## 1. Goal

The Environment feature mirrors the Character feature in Muse Studio.
It allows users to define recurring locations/settings for a film project, attach reference images, and write visual prompts for AI generation.

---

## 2. Current clean state

- **Branch:** `feature/environment`
- Last known commit: `8a1ebad Fix Environment image picker visibility`
- `origin/feature/environment` is up to date
- Working tree expected: clean

---

## 3. Validated behavior

- CRUD Environment OK
- Upload/delete image OK
- Persistence after reload OK
- Environment images available in workflow image inputs OK
- Environment images hidden from non-image inputs OK

---

## 4. Immediate next task

- Add `Muse prompt` button/function to the Environment page.
- **File allowed to modify:** `muse-studio/components/environments/EnvironmentsPageClient.tsx`
- **Read-only reference file:** `muse-studio/components/characters/CharactersPageClient.tsx`
- Do not modify any other files.

---

## 5. Prompt for next Cline task

```
Lis ENVIRONMENT_MODEL_HANDOFF.md.

Objectif :
Ajouter le bouton/fonction "Muse prompt" dans la page Environment, en miroir de Character.

Contexte :
La feature Environment est déjà fonctionnelle :
- CRUD Environment
- upload/delete image
- persistence after reload
- Environment images in workflow picker
- Environment images visible only in image inputs

Fichier autorisé à modifier :
- muse-studio/components/environments/EnvironmentsPageClient.tsx

Fichier de référence en lecture seule :
- muse-studio/components/characters/CharactersPageClient.tsx

Contraintes :
- Ne modifie aucun autre fichier.
- Ne crée aucun fichier.
- Ne touche pas aux composants Character.
- Ne touche pas aux workflows.
- Ne touche pas à DB/types/actions.
- Ne lance aucune commande terminal.
- Ne fais pas de commit.
- Fais le plus petit changement possible.
- Copie le mécanisme "Muse prompt" existant côté Character.
- Adapte le texte pour un Environment : décor, lieu, ambiance, lighting, mood, establishing shot.

Après modification :
- Résume exactement le changement.
- Liste les fichiers modifiés.
- Ne lance pas de test.
```

---

## 6. Do not do in next task

- Do not add `Generate image` now
- Do not create `EnvironmentComfyGenerateDialog` now
- Do not touch `ComfyGenerateDialog`
- Do not touch `KanbanBoard`
- Do not touch `app/projects/[id]/page.tsx`
- Do not re-architect Environment
- Do not scan the entire repo
