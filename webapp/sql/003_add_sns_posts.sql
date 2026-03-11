CREATE TABLE sns_posts (
    id BIGSERIAL PRIMARY KEY,
    press_release_id BIGINT NOT NULL REFERENCES press_releases(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('x', 'instagram')),
    content TEXT NOT NULL,
    char_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'failed')),
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
