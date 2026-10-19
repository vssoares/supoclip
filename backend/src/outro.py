"""Per-user outro videos appended to the end of generated clips."""

import re
from pathlib import Path
from typing import List, Optional

from .font_registry import sanitize_user_id_for_path
from .media.common import (
    AUDIO_BITRATE,
    FINAL_VIDEO_CRF,
    FINAL_VIDEO_PRESET,
    OUTPUT_FPS,
    logger,
)
from .media.ffmpeg import (
    ffprobe_duration,
    ffprobe_has_audio,
    ffprobe_video_size,
    run_ffmpeg_command,
)

SUPPORTED_OUTRO_EXTENSIONS = (".mp4", ".mov", ".webm", ".m4v")
OUTROS_DIR = Path(__file__).parent.parent / "outros"
MAX_OUTRO_SECONDS = 15.0


def get_user_outros_dir(user_id: str) -> Path:
    return OUTROS_DIR / sanitize_user_id_for_path(user_id)


def sanitize_outro_stem(file_name: str) -> str:
    safe_stem = re.sub(r"[^A-Za-z0-9_-]", "-", Path(file_name).stem).strip("-")
    if not safe_stem:
        raise ValueError("Invalid outro file name")
    return safe_stem


def list_user_outros(user_id: str) -> List[Path]:
    outros_dir = get_user_outros_dir(user_id)
    if not outros_dir.exists():
        return []
    return sorted(
        path
        for path in outros_dir.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_OUTRO_EXTENSIONS
    )


def find_user_outro_path(filename: Optional[str], user_id: str) -> Optional[Path]:
    """Resolve an exact outro filename inside one user's directory only."""
    requested = (filename or "").strip()
    if not requested or Path(requested).name != requested:
        return None
    path = get_user_outros_dir(user_id) / requested
    if path.is_file() and path.suffix.lower() in SUPPORTED_OUTRO_EXTENSIONS:
        return path
    return None


def append_outro(clip_path: Path, outro_path: Path) -> bool:
    """Append the outro to the clip, replacing the clip file in place.

    The outro is letterboxed to the clip's frame and normalised to its fps and
    audio format so the concat filter can join them. An outro without audio
    gets silence. Returns False (leaving the clip untouched) on any failure.
    """
    output_path = clip_path.with_name(f"{clip_path.stem}.outro.mp4")
    try:
        width, height = ffprobe_video_size(clip_path)
        outro_duration = min(ffprobe_duration(outro_path), MAX_OUTRO_SECONDS)
        if width <= 0 or height <= 0 or outro_duration <= 0.05:
            logger.warning("Skipping outro: unreadable clip or outro %s", outro_path)
            return False

        clip_has_audio = ffprobe_has_audio(clip_path)
        outro_has_audio = ffprobe_has_audio(outro_path)
        clip_duration = ffprobe_duration(clip_path)

        audio_format = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo"
        silence = "anullsrc=r=48000:cl=stereo,atrim=duration={:.3f}"
        filters = [
            f"[0:v]fps={OUTPUT_FPS},setsar=1,format=yuv420p[v0]",
            f"[1:v]trim=duration={outro_duration:.3f},setpts=PTS-STARTPTS,"
            f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
            f"fps={OUTPUT_FPS},setsar=1,format=yuv420p[v1]",
            f"[0:a]{audio_format}[a0]"
            if clip_has_audio
            else f"{silence.format(clip_duration)}[a0]",
            f"[1:a]atrim=duration={outro_duration:.3f},asetpts=PTS-STARTPTS,{audio_format}[a1]"
            if outro_has_audio
            else f"{silence.format(outro_duration)}[a1]",
            "[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]",
        ]

        result = run_ffmpeg_command(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(clip_path),
                "-i",
                str(outro_path),
                "-filter_complex",
                ";".join(filters),
                "-map",
                "[v]",
                "-map",
                "[a]",
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
        logger.info("Appended outro %s to %s", outro_path.name, clip_path.name)
        return True
    except Exception as exc:
        logger.error("Failed to append outro to %s: %s", clip_path, exc)
        return False
    finally:
        output_path.unlink(missing_ok=True)
