-- ============================================================================
-- FREEHALL — SEED DATA
-- Run AFTER schema.sql.
-- ============================================================================

-- 1. UNIVERSITIES
INSERT INTO universities (id, name, short_code, matricule_prefix, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'University of Bamenda', 'UBa', 'UBa', TRUE),
    ('22222222-2222-2222-2222-222222222222', 'University of Buea',     'UB',  'UB',  TRUE)
ON CONFLICT (short_code) DO NOTHING;

-- 2. DEFAULT SUPER ADMIN
-- Paste your real bcrypt hash into the password_hash field before running this file.
INSERT INTO users
    (id, university_id, full_name, matricule, email, password_hash,
     department, level, role, status)
VALUES
    (
        '99999999-9999-9999-9999-999999999999',
        '11111111-1111-1111-1111-111111111111',
        'Super Admin (SEN CC)',
        'UBa23E0001',
        'admin@freehall.cm',
        '$2a$10$PASTE_REAL_BCRYPT_HASH_HERE',
        'Software Engineering',
        'Level 300',
        'super_admin',
        'approved'
    )
ON CONFLICT (matricule) DO NOTHING;

-- 3. FEATURE FLAGS (all OFF for Semester 1 launch)
INSERT INTO system_settings (university_id, setting_key, is_enabled) VALUES
    ('11111111-1111-1111-1111-111111111111', 'enable_student_view',    FALSE),
    ('11111111-1111-1111-1111-111111111111', 'enable_student_premium', FALSE),
    ('11111111-1111-1111-1111-111111111111', 'enable_sponsor_banners', FALSE),
    ('22222222-2222-2222-2222-222222222222', 'enable_student_view',    FALSE),
    ('22222222-2222-2222-2222-222222222222', 'enable_student_premium', FALSE),
    ('22222222-2222-2222-2222-222222222222', 'enable_sponsor_banners', FALSE)
ON CONFLICT (university_id, setting_key) DO NOTHING;

-- 4. SAMPLE UBa HALLS
INSERT INTO halls
    (university_id, name, zone, capacity_tier, approx_capacity_range, status, submitted_by)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Amphi 1000',       'Main Campus Amphis', 'amphi',  '250+',      'approved', '99999999-9999-9999-9999-999999999999'),
    ('11111111-1111-1111-1111-111111111111', 'Amphi 500',        'Main Campus Amphis', 'amphi',  '250+',      'approved', '99999999-9999-9999-9999-999999999999'),
    ('11111111-1111-1111-1111-111111111111', 'Amphi 250',        'Main Campus Amphis', 'amphi',  '250+',      'approved', '99999999-9999-9999-9999-999999999999'),
    ('11111111-1111-1111-1111-111111111111', 'COLTECH Hall A',   'COLTECH',            'large',  '120 - 250', 'approved', '99999999-9999-9999-9999-999999999999'),
    ('11111111-1111-1111-1111-111111111111', 'COLTECH Room 101', 'COLTECH',            'medium', '50 - 120',  'approved', '99999999-9999-9999-9999-999999999999')
ON CONFLICT (university_id, name) DO NOTHING;