# Muse Studio + ComfyUI in the same docker-compose stack

This patch changes Muse Studio so the backend talks to ComfyUI through Docker's internal network:

```env
COMFYUI_BASE_URL=http://comfyui:8188
```

instead of:

```env
COMFYUI_BASE_URL=http://host.docker.internal:8000
```

## Files to copy

Copy these into `F:\AI\MuseStudio`:

```text
docker-compose.yml
docker/comfyui/Dockerfile
docker/comfyui/extra_model_paths.yaml
```

## Why this solves the local API problem

Muse backend and ComfyUI now run inside the same Docker Compose project. Muse calls ComfyUI by service name (`comfyui`) instead of leaving Docker to reach ComfyUI Desktop through `host.docker.internal`.

The host can still open ComfyUI at:

```text
http://localhost:8000
```

Inside Docker, Muse uses:

```text
http://comfyui:8188
```

## Reusing your existing ComfyUI_App install

The compose file mounts your existing sibling install:

```text
F:\AI\ComfyUI_App\models       -> /models
F:\AI\ComfyUI_App\custom_nodes -> /workspace/ComfyUI/custom_nodes
F:\AI\ComfyUI_App\input        -> /workspace/ComfyUI/input
F:\AI\ComfyUI_App\user         -> /workspace/ComfyUI/user
```

Because `F:\AI\MuseStudio` and `F:\AI\ComfyUI_App` are siblings, this is written as:

```yaml
../ComfyUI_App/models:/models:ro
../ComfyUI_App/custom_nodes:/workspace/ComfyUI/custom_nodes
../ComfyUI_App/input:/workspace/ComfyUI/input
../ComfyUI_App/user:/workspace/ComfyUI/user
```

The models mount is read-only to avoid accidental edits/deletes.

## Run

From `F:\AI\MuseStudio`:

```bash
docker compose down
docker compose up --build
```

## Important notes

1. Stop ComfyUI Desktop first if it already uses host port 8000.
2. If Docker complains about GPU support, verify Docker Desktop has NVIDIA GPU support enabled. You can temporarily remove `gpus: all` only to check whether the container starts on CPU.
3. Partner/API nodes may still require that the ComfyUI account/API-key state exists in `F:\AI\ComfyUI_App\user`. This patch mounts that folder into the Docker ComfyUI instance.
4. If some custom nodes need extra Python dependencies, install them inside the image or add a custom-node requirements installation step. This patch mounts the nodes, but it does not automatically run every custom node's installer.
