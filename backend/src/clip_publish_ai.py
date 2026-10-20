"""
AI helpers for publishing a clip: the title/description/hashtags and the
thumbnail (a frame from the clip with an AI-written headline on top).
"""

from __future__ import annotations

import io
import logging
import tempfile
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, Field
from pydantic_ai import Agent, NativeOutput
from PIL import Image, ImageDraw, ImageFont

from .ai import _build_transcript_model, _get_missing_llm_key_error, _split_llm_name
from .config import get_config
from .media.ffmpeg import run_ffmpeg_command
from .runtime_settings import apply_settings_to_process_env

logger = logging.getLogger(__name__)

THUMBNAIL_SIZE = (1080, 1920)
THUMBNAIL_FONT = Path(__file__).resolve().parent.parent / "fonts" / "Anton-Regular.ttf"
DEFAULT_COVER_MOMENT = 0.3


class PublishCopy(BaseModel):
    """Everything the creator needs to publish one clip."""

    title: str = Field(description="Scroll-stopping title, at most 80 characters")
    description: str = Field(
        description="2-3 short sentences for the post description: a hook, what the viewer gets, and a call to action"
    )
    hashtags: List[str] = Field(description="5-8 relevant hashtags without the # sign")
    thumbnail_headline: str = Field(
        description="2-6 word punchy text for the thumbnail, curiosity-driven, no emojis"
    )
    cover_moment: float = Field(
        default=DEFAULT_COVER_MOMENT,
        description="Where in the clip (0.0 start, 1.0 end) the most expressive frame is likely to be",
    )


publish_copy_system_prompt = """You are a social media editor writing the publishing copy for one short vertical video clip.

You receive the clip's transcript, its working hook title, and why it was selected. Write copy that makes a scrolling viewer stop and watch.

Rules:
- Write in the same language as the transcript.
- Use only what the transcript supports: no invented facts, names, numbers or claims.
- title: concrete and curiosity-driven, at most 80 characters, no clickbait that the clip does not pay off.
- description: 2-3 short sentences. Open with the hook, say what the viewer gets, end with a call to action (follow, comment, share).
- hashtags: 5-8 specific tags (topic, niche, platform-style like shorts). No # sign, no spaces.
- thumbnail_headline: 2-6 words, high contrast and emotional or curious, readable at a glance, no emojis, no quotes.
- cover_moment: a number between 0.1 and 0.8 estimating where the most visually expressive moment is (usually when the key point lands).
- Stay content-neutral: do not soften or avoid a topic because it is sensitive.
- Return valid JSON only."""


def _agent() -> Agent[None, PublishCopy]:
    runtime_config = get_config()
    provider, _ = _split_llm_name(runtime_config.llm)
    apply_settings_to_process_env(runtime_config.as_runtime_settings())
    config_error = _get_missing_llm_key_error(runtime_config.llm, runtime_config)
    if config_error:
        raise RuntimeError(config_error)
    return Agent[None, PublishCopy](
        model=_build_transcript_model(runtime_config),
        output_type=NativeOutput(PublishCopy, strict=True)
        if provider == "openrouter"
        else PublishCopy,
        system_prompt=publish_copy_system_prompt,
        output_retries=2,
    )


def _clean_tags(tags: List[str]) -> List[str]:
    seen: set[str] = set()
    result: List[str] = []
    for tag in tags:
        value = "".join(tag.split()).lstrip("#")
        if value and value.lower() not in seen:
            seen.add(value.lower())
            result.append(value)
    return result[:8]


async def generate_publish_copy(
    *,
    transcript: str,
    hook_title: Optional[str],
    reasoning: Optional[str],
    guidance: Optional[str] = None,
) -> PublishCopy:
    parts = [
        f"Transcript:\n{(transcript or '').strip()[:6000]}",
        f"Working hook title: {hook_title or 'none'}",
        f"Why this clip was selected: {(reasoning or 'n/a')[:500]}",
    ]
    if guidance and guidance.strip():
        parts.append(f"Creator's instruction (follow it): {guidance.strip()[:300]}")
    result = await _agent().run("\n\n".join(parts))
    copy = result.output
    copy.title = " ".join(copy.title.split())[:100]
    copy.description = copy.description.strip()
    copy.hashtags = _clean_tags(copy.hashtags)
    copy.thumbnail_headline = " ".join(copy.thumbnail_headline.split())[:60]
    copy.cover_moment = min(0.8, max(0.1, copy.cover_moment))
    return copy


def extract_frame(video_path: Path, seconds: float) -> Image.Image:
    """Grab one frame from the clip with ffmpeg."""
    with tempfile.TemporaryDirectory() as directory:
        target = Path(directory) / "frame.jpg"
        result = run_ffmpeg_command(
            [
                "ffmpeg", "-y", "-ss", f"{max(0.0, seconds):.2f}", "-i", str(video_path),
                "-frames:v", "1", "-q:v", "2", str(target),
            ],
            timeout=60,
        )
        if result.returncode != 0 or not target.exists():
            raise RuntimeError("Could not read a frame from the clip.")
        with Image.open(target) as frame:
            return frame.convert("RGB")


def _cover_crop(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    width, height = size
    scale = max(width / image.width, height / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> List[str]:
    lines: List[str] = []
    current = ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if current and draw.textlength(candidate, font=font) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def render_thumbnail(frame: Image.Image, headline: str) -> bytes:
    """Compose the 9:16 thumbnail: the frame, a bottom gradient and the headline."""
    width, height = THUMBNAIL_SIZE
    base = _cover_crop(frame, THUMBNAIL_SIZE).convert("RGBA")

    gradient = Image.new("RGBA", THUMBNAIL_SIZE, (0, 0, 0, 0))
    gradient_draw = ImageDraw.Draw(gradient)
    start = int(height * 0.45)
    for y in range(start, height):
        alpha = int(215 * ((y - start) / (height - start)) ** 1.4)
        gradient_draw.line([(0, y), (width, y)], fill=(0, 0, 0, alpha))
    base = Image.alpha_composite(base, gradient)

    text = (headline or "").strip().upper()
    if text:
        draw = ImageDraw.Draw(base)
        margin = 70
        max_width = width - margin * 2
        size = 190
        while True:
            font = ImageFont.truetype(str(THUMBNAIL_FONT), size)
            lines = _wrap(draw, text, font, max_width)
            fits = all(draw.textlength(line, font=font) <= max_width for line in lines)
            if (fits and len(lines) <= 4) or size <= 70:
                break
            size -= 10
        line_height = int(size * 1.12)
        block = line_height * len(lines)
        y = int(height * 0.80) - block // 2
        stroke = max(4, size // 22)
        for index, line in enumerate(lines):
            line_width = draw.textlength(line, font=font)
            fill = (255, 214, 10) if index == len(lines) - 1 and len(lines) > 1 else (255, 255, 255)
            draw.text(
                ((width - line_width) / 2, y + index * line_height),
                line,
                font=font,
                fill=fill,
                stroke_width=stroke,
                stroke_fill=(0, 0, 0),
            )

    output = io.BytesIO()
    base.convert("RGB").save(output, format="JPEG", quality=88, optimize=True)
    return output.getvalue()


def build_thumbnail(video_path: Path, duration: float, headline: str, moment: float) -> bytes:
    seconds = min(max(0.0, duration - 0.2), max(0.0, duration * moment))
    return render_thumbnail(extract_frame(video_path, seconds), headline)
