"""
Muse Backend Configuration Loader.

Priority order (highest to lowest):
  1. Environment variables (for secrets — API keys should NEVER go in muse_config.json)
  2. muse_config.local.json (gitignored — runtime overrides written by Settings → LLM)
  3. muse_config.json (versioned — defaults, never written to at runtime)
  4. Hardcoded defaults
"""

import json
import logging
import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# Path to muse_config.json — sits next to the muse_backend/ folder root
_CONFIG_FILE = Path(__file__).parent.parent / "muse_config.json"
# Gitignored local override file, written by POST /llm/config — never edit muse_config.json at runtime
_LOCAL_CONFIG_FILE = Path(__file__).parent.parent / "muse_config.local.json"


def _read_json_file(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
        data.pop("_comment", None)
        return data


def _merge_config(base: dict, override: dict) -> dict:
    """Shallow merge, one level deep — sufficient for the current flat/one-nested-level sections."""
    merged = dict(base)
    for key, val in override.items():
        if isinstance(val, dict) and isinstance(merged.get(key), dict):
            merged[key] = {**merged[key], **val}
        else:
            merged[key] = val
    return merged


def load_merged_config() -> dict:
    """Load muse_config.json merged with muse_config.local.json (local wins). Used by config.py,
    llm.py and llm_bridge.py so all readers stay in sync."""
    base = _read_json_file(_CONFIG_FILE)
    try:
        local = _read_json_file(_LOCAL_CONFIG_FILE)
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Ignoring invalid muse_config.local.json: %s", exc)
        local = {}
    return _merge_config(base, local)


_raw = load_merged_config()


def _get(path: str, default=None):
    """Dot-notation getter into the raw config dict."""
    keys = path.split(".")
    val = _raw
    for k in keys:
        if not isinstance(val, dict):
            return default
        val = val.get(k, default)
    return val


@dataclass
class ServerConfig:
    host: str = field(default_factory=lambda: _get("server.host", "0.0.0.0"))
    port: int = field(default_factory=lambda: _get("server.port", 8000))
    reload: bool = field(default_factory=lambda: _get("server.reload", True))
    log_level: str = field(default_factory=lambda: _get("server.log_level", "info"))


@dataclass
class ProviderConfig:
    image_draft: str = field(default_factory=lambda: _get("providers.image_draft", "flux_klein"))
    image_refine: str = field(default_factory=lambda: _get("providers.image_refine", "flux_klein"))
    video_default: str = field(default_factory=lambda: _get("providers.video_default", "wan2.2"))


# Hot-reload: llm is read from _raw on every access so POST /llm/config can take effect without restart.
def _provider_llm(_self: ProviderConfig) -> str:
    return _get("providers.llm", "openai")


ProviderConfig.llm = property(_provider_llm)  # type: ignore[assignment]


@dataclass
class ImageGenConfig:
    default_aspect_ratio: str = field(default_factory=lambda: _get("generation.image.default_aspect_ratio", "16:9"))
    default_denoise_strength: float = field(default_factory=lambda: _get("generation.image.default_denoise_strength", 0.35))
    max_reference_images: int = field(default_factory=lambda: _get("generation.image.max_reference_images", 5))


@dataclass
class VideoGenConfig:
    default_duration_seconds: int = field(default_factory=lambda: _get("generation.video.default_duration_seconds", 5))
    default_fps: int = field(default_factory=lambda: _get("generation.video.default_fps", 24))


@dataclass
class InferenceConfig:
    # Controls CPU offloading for FLUX.2-Klein pipeline components.
    # "none"       → all components stay on GPU  (fastest, requires ~32 GB VRAM)
    # "model"      → enable_model_cpu_offload()  (saves ~15 GB, medium speed)
    # "sequential" → enable_sequential_cpu_offload() (minimum VRAM, slowest)
    flux_klein_offload: str = field(
        default_factory=lambda: _get("inference.flux_klein_offload", "none")
    )


@dataclass
class LLMConfig:
    max_tokens: int = field(default_factory=lambda: _get("generation.llm.max_tokens", 2048))
    temperature: float = field(default_factory=lambda: _get("generation.llm.temperature", 0.8))
    stream: bool = field(default_factory=lambda: _get("generation.llm.stream", True))


@dataclass
class DebugConfig:
    """Empty dataclass — log_prompts is a property (not a field) for hot-reload, see below."""


# Hot-reload: log_prompts is read from _raw on every access so POST /llm/config can take effect
# without restart (same pattern as ProviderConfig.llm above).
def _debug_log_prompts(_self: DebugConfig) -> bool:
    return _get("debug.log_prompts", False)


DebugConfig.log_prompts = property(_debug_log_prompts)  # type: ignore[assignment]


class ModelFormat:
    BF16 = "bf16"
    FP16 = "fp16"
    FP8 = "fp8"
    FP4 = "fp4"
    GGUF = "gguf"


@dataclass
class AppConfig:
    # Resolve models_path relative to project root (parent of muse_backend/)
    _raw_models_path: str = field(
        default_factory=lambda: _get("models_path", "../models")
    )
    # Resolve outputs_path relative to project root — defaults to muse-studio/outputs
    _raw_outputs_path: str = field(
        default_factory=lambda: _get("outputs_path", "../muse-studio/outputs")
    )
    server: ServerConfig = field(default_factory=ServerConfig)
    providers: ProviderConfig = field(default_factory=ProviderConfig)
    image_gen: ImageGenConfig = field(default_factory=ImageGenConfig)
    video_gen: VideoGenConfig = field(default_factory=VideoGenConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    inference: InferenceConfig = field(default_factory=InferenceConfig)
    debug: DebugConfig = field(default_factory=DebugConfig)

    # Model format preferences per model name (from muse_config.json)
    _model_formats_raw: dict = field(
        default_factory=lambda: {
            k: v for k, v in (_get("model_formats") or {}).items()
            if not k.startswith("_comment")
        }
    )

    # --- API keys (from environment only — never in config file) ---
    openai_api_key: Optional[str] = field(default_factory=lambda: os.getenv("OPENAI_API_KEY"))
    anthropic_api_key: Optional[str] = field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY"))
    openrouter_api_key: Optional[str] = field(default_factory=lambda: os.getenv("OPENROUTER_API_KEY"))
    kling_api_key: Optional[str] = field(default_factory=lambda: os.getenv("KLING_API_KEY"))
    seeddance_api_key: Optional[str] = field(default_factory=lambda: os.getenv("SEEDDANCE_API_KEY"))
    runway_api_key: Optional[str] = field(default_factory=lambda: os.getenv("RUNWAY_API_KEY"))

    @property
    def models_path(self) -> Path:
        """Resolved absolute path to the models directory."""
        raw = Path(self._raw_models_path)
        if raw.is_absolute():
            return raw
        project_root = Path(__file__).parent.parent.parent
        return (project_root / raw).resolve()

    @property
    def outputs_path(self) -> Path:
        """Resolved absolute path to the shared outputs directory (served by Next.js)."""
        raw = Path(self._raw_outputs_path)
        if raw.is_absolute():
            return raw
        project_root = Path(__file__).parent.parent.parent
        return (project_root / raw).resolve()

    def get_model_path(self, model_name: str) -> Path:
        """Returns the expected folder for a specific model."""
        return self.models_path / model_name

    def get_model_format(self, model_name: str) -> str:
        """
        Returns the configured format for a model: 'bf16', 'fp8', or 'gguf'.
        Falls back to 'bf16' if not specified.
        """
        return self._model_formats_raw.get(model_name, ModelFormat.BF16)

    def reload_from_file(self):
        """Hot-reload config from muse_config.json + muse_config.local.json without restarting the server."""
        global _raw
        _raw = load_merged_config()


# Singleton instance — import this everywhere
settings = AppConfig()
