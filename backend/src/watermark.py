"""Per-user watermark images overlaid on a corner of generated clips."""

from pathlib import Path
from typing import Any, List, Optional

from .font_registry import sanitize_user_id_for_path
from .media.common import AUDIO_BITRATE, FINAL_VIDEO_CRF, FINAL_VIDEO_PRESET, logger
from .media.ffmpeg import ffprobe_video_size, run_ffmpeg_command
from .outro import sanitize_outro_stem

SUPPORTED_WATERMARK_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")
WATERMARKS_DIR = Path(__file__).parent.parent / "watermarks"
WATERMARK_POSITIONS = ("top-left", "top-right", "bottom-left", "bottom-right")
DEFAULT_WATERMARK_POSITION = "bottom-right"
# Share of the clip width the watermark occupies, and of the width left as margin.
WATERMARK_WIDTH_RATIO = 0.2
WATERMARK_MARGIN_RATIO = 0.04
WATERMARK_OPACITY = 0.6


def get_user_watermarks_dir(user_id: str) -> Path:
    return WATERMARKS_DIR / sanitize_user_id_for_path(user_id)


def sanitize_watermark_stem(file_name: str) -> str:
    return sanitize_outro_stem(file_name)


def list_user_watermarks(user_id: str) -> List[Path]:
    directory = get_user_watermarks_dir(user_id)
    if not directory.exists():
        return []
    return sorted(
        path
        for path in directory.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_WATERMARK_EXTENSIONS
    )


def find_user_watermark_path(filename: Optional[str], user_id: str) -> Optional[Path]:
    """Resolve an exact watermark filename inside one user's directory only."""
    requested = (filename or "").strip()
    if not requested or Path(requested).name != requested:
        return None
    path = get_user_watermarks_dir(user_id) / requested
    if path.is_file() and path.suffix.lower() in SUPPORTED_WATERMARK_EXTENSIONS:
        return path
    return None


def normalize_watermark_request(value: Any) -> Optional[dict]:
    """Return {"filename", "position"} from a request/metadata value, or None."""
    if not isinstance(value, dict):
        return None
    filename = value.get("filename")
    if not isinstance(filename, str) or not filename.strip():
        return None
    position = value.get("position")
    if position not in WATERMARK_POSITIONS:
        position = DEFAULT_WATERMARK_POSITION
    return {"filename": filename.strip(), "position": position}


def _overlay_position(position: str, margin: int) -> str:
    horizontal = f"{margin}" if position.endswith("left") else f"main_w-overlay_w-{margin}"
    vertical = f"{margin}" if position.startswith("top") else f"main_h-overlay_h-{margin}"
    return f"x={horizontal}:y={vertical}"


def apply_watermark(
    clip_path: Path,
    image_path: Path,
    position: str = DEFAULT_WATERMARK_POSITION,
) -> bool:
    """Overlay the image on one corner of the clip, replacing the clip file in place.

    Returns False (leaving the clip untouched) on any failure.
    """
    if position not in WATERMARK_POSITIONS:
        position = DEFAULT_WATERMARK_POSITION
    output_path = clip_path.with_name(f"{clip_path.stem}.watermark.mp4")
    try:
        width, height = ffprobe_video_size(clip_path)
        if width <= 0 or height <= 0:
            logger.warning("Skipping watermark: unreadable clip %s", clip_path)
            return False

        watermark_width = max(16, round(width * WATERMARK_WIDTH_RATIO / 2) * 2)
        margin = max(8, round(width * WATERMARK_MARGIN_RATIO))
        filters = (
            f"[1:v]scale={watermark_width}:-2,format=rgba,"
            f"colorchannelmixer=aa={WATERMARK_OPACITY}[wm];"
            f"[0:v][wm]overlay={_overlay_position(position, margin)}:format=auto,"
            "format=yuv420p[v]"
        )
        result = run_ffmpeg_command(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(clip_path),
                "-i",
                str(image_path),
                "-filter_complex",
                filters,
                "-map",
                "[v]",
                "-map",
                "0:a?",
                "-c:v",
                "libx264",
                "-preset",
                FINAL_VIDEO_PRESET,
                "-crf",
                str(FINAL_VIDEO_CRF),
                "-c:a",
                "aac",
                "-b:a",
                AUDIO_BITRATE,
                "-movflags",
                "+faststart",
                str(output_path),
            ]
        )
        if result.returncode != 0 or not output_path.exists():
            return False

        output_path.replace(clip_path)
        logger.info("Applied watermark %s (%s) to %s", image_path.name, position, clip_path.name)
        return True
    except Exception as exc:
        logger.error("Failed to apply watermark to %s: %s", clip_path, exc)
        return False
    finally:
        output_path.unlink(missing_ok=True)
