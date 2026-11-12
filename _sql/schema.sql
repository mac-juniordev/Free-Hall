-- ============================================================================
-- FREEHALL — SCHEMA (PGADMIN 4 READY)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS sponsors CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS swap_requests CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS halls CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS universities CASCADE;

-- 1. UNIVERSITIES
CREATE TABLE universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    short_code VARCHAR(20) NOT NULL UNIQUE,
    matricule_prefix VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    full_name VARCHAR(120) NOT NULL,
    matricule VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    department VARCHAR(120) NOT NULL,
    level VARCHAR(20) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'cc' CHECK (role IN ('super_admin', 'cc', 'assistant')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_university ON users(university_id);
CREATE INDEX idx_users_status ON users(status);

-- 3. PASSWORD RESETS
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_password_resets_user ON password_resets(user_id);

-- 4. HALLS
CREATE TABLE halls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    zone VARCHAR(100) NOT NULL,
    capacity_tier VARCHAR(20) NOT NULL CHECK (capacity_tier IN ('small', 'medium', 'large', 'amphi')),
    approx_capacity_range VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (university_id, name)
);
CREATE INDEX idx_halls_university_status ON halls(university_id, status);

-- 5. BOOKINGS
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    hall_id UUID NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_code VARCHAR(30) NOT NULL,
    student_count INTEGER NOT NULL CHECK (student_count > 0),
    booking_type VARCHAR(20) NOT NULL DEFAULT 'instant' CHECK (booking_type IN ('instant', 'scheduled')),
    is_checked_in BOOLEAN NOT NULL DEFAULT TRUE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time)
);
CREATE INDEX idx_bookings_hall_status ON bookings(hall_id, status);
CREATE INDEX idx_bookings_university_time ON bookings(university_id, start_time, end_time);

-- 6. SWAP REQUESTS
CREATE TABLE swap_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    requester_booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    target_booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);

-- 7. SYSTEM SETTINGS (feature flags)
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    setting_key VARCHAR(60) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_date TIMESTAMPTZ NULL,
    announcement_text TEXT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (university_id, setting_key)
);

-- 8. SPONSORS
CREATE TABLE sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    business_name VARCHAR(120) NOT NULL,
    banner_text VARCHAR(255) NOT NULL,
    whatsapp_footer VARCHAR(180) NOT NULL,
    contact_phone VARCHAR(30) NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sponsors_active ON sponsors(university_id, is_active, expires_at);