-- PostgreSQL Schema for FurRIT API

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Represents the status of an Event (canceled, tentative, confirmed)
CREATE TYPE event_status AS ENUM ('canceled', 'tentative', 'confirmed');

-- Represents the answer to an RSVP (no, maybe, yes)
CREATE TYPE rsvp_answer AS ENUM ('no', 'maybe', 'yes');

-- Represents the state of a Registration (pending, verified, expired)
CREATE TYPE registration_status AS ENUM ('pending', 'verified', 'expired');

-- Represents User Roles
CREATE TYPE user_role_type AS ENUM (
    'standard', 
    'volunteer', 
    'sysadmin', 
    'admin', 
    'bot'
);

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Static list of recognized RIT degrees (for /degrees endpoint)
-- Unsure if this should be managed by the DB or if the frontend can have a selection for degrees
CREATE TABLE recognized_degrees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE -- e.g., "Software Engineering BS"
);

-- User Registrations (Pre-user verification flow)
-- Tracks pending users who have not yet been verified
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rit_username TEXT NOT NULL UNIQUE, -- Format: [a-z]+[0-9]+
    verification_code TEXT NOT NULL,   -- 128 hex chars
    status registration_status DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL -- Links to user once verified
);

-- Active User Sessions (Mapped to /session and /session/self)
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    csrf_token TEXT NOT NULL -- For /CsrfParameter
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- =============================================================================
-- USERS & SOCIALS
-- =============================================================================

-- Users (Central Identity)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    class INTEGER,
    degrees TEXT[],
    about_me TEXT,
    media_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
    telegram_username TEXT, -- Nullable (kept for legacy resemblance to the old site)
    role user_role_type DEFAULT 'standard',
    is_disabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_role ON users(role);

-- -- Social Verification Logs
-- CREATE TABLE social_verifications (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     platform TEXT NOT NULL CHECK (platform IN ('telegram', 'discord', 'stoat')),
--     claimed_username TEXT NOT NULL,
--     verification_status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
--     verification_proof_hash TEXT, -- Hash of proof submitted during claim
--     verified_at TIMESTAMPTZ,
--     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );
-- CREATE INDEX idx_social_verifications_user ON social_verifications(user_id);
-- CREATE INDEX idx_social_verifications_platform ON social_verifications(platform);

-- =============================================================================
-- MEDIA FILES TABLE
-- =============================================================================

-- Media Files (Centralized reference for all media content)
-- Stores metadata for media files stored flat in a directory
-- FK relationships from user_sonas, events, and other tables reference this table
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name TEXT NOT NULL,           -- Original file name with extension
    file_path TEXT NOT NULL,           -- Relative path in the flat directory (e.g., "avatars/abc1234.png")
    file_type TEXT NOT NULL,           -- MIME type (e.g., "image/png", "video/mp4")
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,    -- Track if media is visible/available

);
CREATE INDEX idx_media_files_path ON media_files(file_path);
CREATE INDEX idx_media_files_type ON media_files(file_type);
CREATE INDEX idx_media_files_active ON media_files(is_active) WHERE is_active = TRUE;




-- =============================================================================
-- RELATIONSHIP TABLES (Connections)
-- =============================================================================

-- Event Organizers
-- Events are owned by a User
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    location TEXT NOT NULL, -- e.g., "online"
    status event_status NOT NULL,
    dtstart TIMESTAMPTZ NOT NULL,
    dtend TIMESTAMPTZ,
    description TEXT,          -- Nullable
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_event_times CHECK (dtend IS NULL OR dtstart <= dtend) -- Ensure End time is after Start time
);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_dtstart ON events(dtstart);

-- Event RSVPs (N:M between Users and Events)
-- Maps to /event/{eventId}/rsvps
CREATE TABLE event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answer rsvp_answer NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_event UNIQUE (user_id, event_id) -- Ensure one RSVP per user per event
);
-- Ensure one RSVP per user per event
CREATE UNIQUE INDEX idx_rsvp_user_event ON event_rsvps(user_id, event_id);
CREATE INDEX idx_event_rsvps_event_id ON event_rsvps(event_id);

-- User Sona Information (Name, Species)
-- Maps to UserConnections.sonas
CREATE TABLE user_sonas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    species TEXT, -- Nullable
    media_id UUID REFERENCES media_files(id) ON DELETE CASCADE, -- media for photos
    UNIQUE(user_id, name)
);
CREATE INDEX idx_sonas_user ON user_sonas(user_id);

-- User Social Media Links (Platform, Handle)
-- Maps to UserConnections.socials
CREATE TABLE user_socials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- e.g., "Discord"
    handle TEXT NOT NULL,   -- e.g., "@mrwolf"
    platform_user_id TEXT,       -- UUID/ID for a user on another platform like discord/telegram
    is_verified BOOLEAN DEFAULT FALSE, -- True if a user has verified their socials.
    UNIQUE(user_id, platform)
);
CREATE INDEX idx_socials_user ON user_socials(user_id);

-- User Degrees (Optional: If you want to separate the array to allow querying by specific degree)
-- Note: OpenAPI spec shows degrees as an array in users. 
-- For strict normalization, TEXT[] is 
-- sufficient for the API response format and faster for simple queries.
-- If strict foreign key integrity is needed:
CREATE TABLE user_degrees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    degree_name TEXT NOT NULL REFERENCES recognized_degrees(name) ON DELETE CASCADE,
    UNIQUE(user_id, degree_name)
);
-- Create Index for efficient filtering (optional)
CREATE INDEX idx_user_degrees_user ON user_degrees(user_id);
CREATE INDEX idx_user_degrees_name ON user_degrees(degree_name);

-- =============================================================================
-- COMMENTS & METADATA
-- =============================================================================

COMMENT ON TABLE users IS 'Stores user identity, credentials, and profile details.';
COMMENT ON COLUMN users.username IS 'The login identifier used in /session endpoint.';
COMMENT ON COLUMN users.is_disabled IS 'Used for ForbiddenError checks when user is inactive.';
COMMENT ON COLUMN users.class IS 'User academic year of graduation (e.g., 2028). Nullable per spec.';
COMMENT ON COLUMN users.telegram_username IS 'Legacy support for Telegram username in users table.';

COMMENT ON TABLE user_socials IS 'Stores the actual handle/username displayed in UI for each platform.';
COMMENT ON COLUMN user_socials.handle IS 'Platform-specific handle (e.g., "@mrwolf" for Discord).';
COMMENT ON COLUMN user_socials.is_verified IS 'True if a user has verified their contact with us'

COMMENT ON TABLE events IS 'Stores scheduled events and their details.';

-- COMMENT ON TABLE user_contents IS 'Stores user-generated content such as about me text, photos, and other uploadable media.';
-- COMMENT ON COLUMN user_contents.user_id IS 'References the user who owns this content.';
-- COMMENT ON COLUMN user_contents.content_type IS 'Type of content (about_me, user_photo, sona_photo, etc.)';
-- COMMENT ON COLUMN user_contents.content_path IS 'File path or URL for images/files (null for text-only content).';
-- COMMENT ON COLUMN user_contents.is_active IS 'Flag to determine if content is visible in the UI.';
