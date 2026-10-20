"""
Clip publish assets - AI-written title/description/hashtags and the generated
thumbnail for a clip, kept (one row per clip) until the user publishes it.

The thumbnail JPEG lives in the row itself: it is small, and that keeps it
available to the API and the worker regardless of the media storage backend.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class ClipAssetsRepository:
    @staticmethod
    async def get(
        db: AsyncSession, clip_id: str, *, with_thumbnail: bool = True
    ) -> Optional[Dict[str, Any]]:
        thumbnail = "thumbnail_jpeg" if with_thumbnail else "NULL AS thumbnail_jpeg"
        result = await db.execute(
            text(
                f"""
                SELECT clip_id, title, description, hashtags, thumbnail_headline,
                       {thumbnail}, updated_at
                FROM clip_publish_assets
                WHERE clip_id = :clip_id
                """
            ),
            {"clip_id": clip_id},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    @staticmethod
    async def save_copy(
        db: AsyncSession,
        clip_id: str,
        *,
        title: str,
        description: str,
        hashtags: list[str],
        thumbnail_headline: str,
    ) -> None:
        await db.execute(
            text(
                """
                INSERT INTO clip_publish_assets
                    (clip_id, title, description, hashtags, thumbnail_headline)
                VALUES (:clip_id, :title, :description, :hashtags, :headline)
                ON CONFLICT (clip_id) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    hashtags = EXCLUDED.hashtags,
                    thumbnail_headline = EXCLUDED.thumbnail_headline,
                    updated_at = NOW()
                """
            ),
            {
                "clip_id": clip_id,
                "title": title,
                "description": description,
                "hashtags": hashtags,
                "headline": thumbnail_headline,
            },
        )
        await db.commit()

    @staticmethod
    async def save_thumbnail(
        db: AsyncSession, clip_id: str, *, headline: str, jpeg: bytes
    ) -> None:
        await db.execute(
            text(
                """
                INSERT INTO clip_publish_assets (clip_id, thumbnail_headline, thumbnail_jpeg)
                VALUES (:clip_id, :headline, :jpeg)
                ON CONFLICT (clip_id) DO UPDATE SET
                    thumbnail_headline = EXCLUDED.thumbnail_headline,
                    thumbnail_jpeg = EXCLUDED.thumbnail_jpeg,
                    updated_at = NOW()
                """
            ),
            {"clip_id": clip_id, "headline": headline, "jpeg": jpeg},
        )
        await db.commit()

    @staticmethod
    async def clear_thumbnail(db: AsyncSession, clip_id: str) -> None:
        await db.execute(
            text(
                "UPDATE clip_publish_assets SET thumbnail_jpeg = NULL, updated_at = NOW() "
                "WHERE clip_id = :clip_id"
            ),
            {"clip_id": clip_id},
        )
        await db.commit()
