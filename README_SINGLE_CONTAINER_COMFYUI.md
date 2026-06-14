# Muse Studio + ComfyUI in the same Docker container

This patch changes the `backend` service so it also starts ComfyUI inside the same container.

Muse backend now talks to ComfyUI locally through:

```text
http://127.0.0.1:8188
```

This avoids calling the separate ComfyUI Desktop instance through `host.docker.internal`.

## Files to replace/add

Replace:

```text
docker-compose.yml
```

Add:

```text
docker/start-backend-with-comfyui.sh
```

## Start

From `F:\AI\MuseStudio`:

```bash
docker compose down
docker compose up --build
```

Muse frontend remains available at:

```text
http://localhost:3000
```

Muse backend remains available at:

```text
http://localhost:8010
```

ComfyUI inside the backend container is exposed at:

```text
http://localhost:8000
```

Inside the backend container, Muse uses:

```text
COMFYUI_BASE_URL=http://127.0.0.1:8188
```

## Where ComfyUI is stored

The patch mounts this local folder:

```text
F:\AI\MuseStudio\ComfyUI
```

into the container as:

```text
/app/ComfyUI
```

On first startup, if `./ComfyUI/main.py` does not exist, the startup script clones the official ComfyUI repo there.

## If startup says git is not installed

Either install git in `Dockerfile.backend`, or clone ComfyUI manually:

```bash
cd F:\AI\MuseStudio
git clone https://github.com/comfyanonymous/ComfyUI.git ComfyUI
```

Then run:

```bash
docker compose up --build
```

## Notes

This patch intentionally does not mount or reuse `F:\AI\ComfyUI_App`.
