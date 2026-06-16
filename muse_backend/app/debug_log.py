"""
Shared "[MUSE PROMPT DEBUG]" console logger, gated by settings.debug.log_prompts
(Settings -> LLM -> Debug -> "Log Muse prompts in server console").
Never pass API keys, tokens, or raw headers here — only prompt text and
non-secret generation parameters.
"""

from __future__ import annotations

import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


def log_muse_prompt_debug(
    flow: str,
    origin: str,
    provider: str,
    model: Optional[str],
    user_prompt: str,
    system_prompt: Optional[str] = None,
    prompt_key: Optional[str] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
) -> None:
    if not settings.debug.log_prompts:
        return

    meta = [f"flow={flow}"]
    if prompt_key:
        meta.append(f"promptKey={prompt_key}")
    meta.append(f"origin={origin}")
    meta.append(f"provider={provider}")
    meta.append(f"model={model or 'unknown'}")
    if temperature is not None:
        meta.append(f"temperature={temperature}")
    if max_tokens is not None:
        meta.append(f"maxTokens={max_tokens}")

    logger.info("[MUSE PROMPT DEBUG] %s", " ".join(meta))
    if system_prompt:
        logger.info("[MUSE PROMPT DEBUG] system prompt:\n%s", system_prompt)
    logger.info("[MUSE PROMPT DEBUG] user prompt:\n%s", user_prompt)
