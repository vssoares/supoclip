CREATE TABLE IF NOT EXISTS clip_publish_assets (
    clip_id VARCHAR(36) PRIMARY KEY REFERENCES generated_clips(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    hashtags TEXT[] NOT NULL DEFAULT '{}',
    thumbnail_headline VARCHAR(255),
    thumbnail_jpeg BYTEA,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
