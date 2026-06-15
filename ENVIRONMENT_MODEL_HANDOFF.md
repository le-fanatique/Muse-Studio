# Muse Studio — Environment Feature Handoff

## 1. Goal

The Environment feature mirrors the Character feature in Muse Studio.
It allows users to define recurring locations/settings for a film project, attach reference images, and write visual prompts for AI generation.

---

## 2. Current Status

- **Branch:** `feature/environment`
- **Derniers commits poussés :**
  - Add Muse prompt for Environment
  - Add Environment image generation
  - Ignore local development launch script
- **Working tree:** clean
- **Docker build:** OK
- **Page Environments:** charge sans crash
- **CRUD Environment:** OK
- **Upload/delete image:** OK
- **Persistence after reload:** OK
- **Environment images available in workflow image inputs:** OK
- **Environment images hidden from non-image inputs:** OK
- **Muse prompt Environment:** OK
- **Generate image Environment:** OK
- **Image générée attachée à l’Environment:** OK
- **Image générée persistante après reload:** OK

*Note: L'outil de validation automatique peut être obsolète par rapport au scope réellement validé par l'utilisateur.*

---

## 3. Next Possible Tasks

1. Polish UI Environment
2. Ajouter plusieurs types d’images Environment
3. Lier Environment aux scènes/shots
4. Améliorer les workflows Comfy dédiés Environment
