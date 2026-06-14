# Restore Muse Studio Docker with external ComfyUI

This patch removes the single-container ComfyUI launch approach.
Muse backend remains in Docker and connects to your external ComfyUI Desktop/local instance through:

```text
http://host.docker.internal:8000
```

## Files to replace

Copy this file to the root of `F:\AI\MuseStudio`:

```text
docker-compose.yml
```

## Files you can remove if they were added by the previous ComfyUI-in-container patch

```text
docker/start-backend-with-comfyui.sh
```

Also remove any `docker/comfyui/`, `comfyui/extra_model_paths.yaml`, or override compose files if they were created during previous attempts.

## Start

```bash
docker compose down
docker compose up -d
```

No `--build` is needed if only `docker-compose.yml` changed.

## Required external ComfyUI

Start your external ComfyUI on Windows/Desktop so it is reachable at:

```text
http://localhost:8000
```

From inside Docker, Muse reaches that same service via:

```text
http://host.docker.internal:8000
```
