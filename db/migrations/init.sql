-- Initial schema and seed for Gurukul application
-- Drops to allow idempotent re-run
DROP TABLE IF EXISTS user_notifications CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS admit_requests CASCADE;
DROP TABLE IF EXISTS gurukul_songs CASCADE;
DROP TABLE IF EXISTS overview_config CASCADE;
DROP TABLE IF EXISTS amrut_images CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE departments (
    id BIGSERIAL PRIMARY KEY,
    dept_name VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) GENERATED ALWAYS AS (dept_name) STORED,
    dept_code VARCHAR(100) NOT NULL UNIQUE,
    head_name VARCHAR(255) DEFAULT 'Not Assigned',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    role_name VARCHAR(255) NOT NULL,
    role_code VARCHAR(100) UNIQUE NOT NULL,
    permissions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    suid VARCHAR(100) UNIQUE,
    role VARCHAR(50) DEFAULT 'user',
    department_id BIGINT DEFAULT 0,
    section_id INT DEFAULT NULL,
    std VARCHAR(50) DEFAULT 'Main',
    roll_number INT,
    date_of_birth DATE,
    mobile_number VARCHAR(20),
    profile_image_url TEXT,
    bio TEXT,
    account_status VARCHAR(50) DEFAULT 'Active',
    joined_date DATE DEFAULT CURRENT_DATE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE SET DEFAULT
);

CREATE TABLE sections (
    id SERIAL PRIMARY KEY,
    department_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    section_head_id INT,
    users_id INT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE overview_config (
    id INT PRIMARY KEY DEFAULT 1,
    hero_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    campus_image TEXT DEFAULT '',
    campus_gallery_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    daily_darshan_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    logo_image TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT overview_config_single_row CHECK (id = 1)
);

CREATE TABLE amrut_images (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    uploaded_by BIGINT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_amrut_uploaded_by
        FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE admit_requests (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    suid VARCHAR(100) NOT NULL,
    performance VARCHAR(50) NOT NULL,
    description TEXT,
    department_id BIGINT NOT NULL,
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    is_user_created BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(255),
    admin_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admit_requests_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE
);

CREATE TABLE applications (
    id BIGSERIAL PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    user_id BIGINT NOT NULL,
    department_id BIGINT NOT NULL,
    suid VARCHAR(100) NOT NULL,
    username VARCHAR(100),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    head_approved BOOLEAN DEFAULT NULL,
    admin_approved BOOLEAN DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    resolved_by BIGINT,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_applications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_applications_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE
);

CREATE TABLE user_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    department_id BIGINT DEFAULT 0,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    head_approved BOOLEAN DEFAULT NULL,
    admin_approved BOOLEAN DEFAULT NULL,
    notification_type VARCHAR(100) DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE gurukul_songs (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    artist VARCHAR(255) DEFAULT 'Gurukul Sevak',
    audio_url TEXT NOT NULL,
    thumbnail_url TEXT DEFAULT '',
    duration VARCHAR(50),
    category VARCHAR(100) DEFAULT 'Bhajan',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lessons (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    department_id BIGINT NOT NULL,
    section_map_id INT DEFAULT NULL,
    section_id INT DEFAULT NULL,
    assigned_to_user_id BIGINT DEFAULT NULL,
    media_url TEXT,
    thumbnail_url TEXT,
    media_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lessons_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_lessons_section
        FOREIGN KEY (section_id)
        REFERENCES sections(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_lessons_assigned_user
        FOREIGN KEY (assigned_to_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_amrut_images_updated_at BEFORE UPDATE ON amrut_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_admit_requests_updated_at BEFORE UPDATE ON admit_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON user_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_gurukul_songs_updated_at BEFORE UPDATE ON gurukul_songs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO departments (id, dept_name, dept_code, head_name, description) VALUES
(1, 'G-Music Department', 'G-MUSIC', 'Music Head', 'Vocal, Instrumental and Classical Music Training.'),
(2, 'Gurukul Art Department', 'GURUKUL-ART', 'Art Head', 'Traditional Art, Painting and Cultural Crafts.'),
(3, 'G-Culture Department', 'G-CULTURE', 'Culture Head', 'Manage cultural events, traditional performances, and creative sections.'),
(5, 'Super Admin Department', 'SUPER-ADMIN', 'Principal', 'Main system administration department.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO roles (role_name, role_code, permissions) VALUES
('super-admin', 'super-admin', '{
	"role": {"view": true,"create": true},"user": {"view": true,"create": true},"overview": {"music": true,"editor": true,"manage": true}}'::jsonb),
('admin', 'admin', '{
	"role": {"view": true,"create": true},"user": {"view": true,"create": true},"overview": {"music": true,"editor": true,"manage": true}}'::jsonb),
('department main', 'department_main', '{"view": true, "edit": true, "approve": true}'::jsonb),
('user', 'user', '{"view": true}'::jsonb)
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO users (id, full_name, username, password, suid, role, department_id, std, account_status, profile_image_url) VALUES 
(123098, 'Super Admin Principal', 'super-admin', 'admin123', 'SUID-ADMIN-01', 'super_admin', 5, 'Main', 'Active', 'https://instagram.fraj3-5.fna.fbcdn.net/v/t51.82787-15/638287693_18002290379884955_4530879865478518753_n.webp?_nc_cat=101&ig_cache_key=MzgzNzMyNDE5NDk2NzIyNzUwMA%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkZFRUQueHBpZHMuMTA4MC5zZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=0-U5-5rPOScQ7kNvwE6AMk6&_nc_oc=AdqMDJfLYj301zZe9IEKTQnB7FRxjoiS8rOl52rZCXndUCqVGiws4PlUjpYlpanYds8Aw3JagGxWakyTopNpCbcy&_nc_ad=z-m&_nc_cid=1174&_nc_zt=23&_nc_ht=instagram.fraj3-5.fna&_nc_gid=SigmqrSzFg1LMXXAZm72rA&_nc_ss=7a22e&oh=00_Af5QxXkZxiTKbRWXbMcrsAdpTV_8RQ7QIlJ57uGHZQYh6w&oe=6A1C9777')
ON CONFLICT (id) DO NOTHING;

INSERT INTO overview_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE INDEX idx_users_suid ON users(suid);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(account_status);
CREATE INDEX idx_amrut_images_created_at ON amrut_images(created_at DESC);
CREATE INDEX idx_amrut_images_active ON amrut_images(is_active);
CREATE INDEX idx_admit_requests_department ON admit_requests(department_id);
CREATE INDEX idx_admit_requests_status ON admit_requests(status);
CREATE INDEX idx_admit_requests_suid ON admit_requests(suid);
CREATE INDEX idx_applications_user ON applications(user_id);
CREATE INDEX idx_applications_department ON applications(department_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_created ON applications(created_at);
CREATE INDEX idx_notifications_user ON user_notifications(user_id);
CREATE INDEX idx_notifications_department ON user_notifications(department_id);
CREATE INDEX idx_notifications_type ON user_notifications(notification_type);
CREATE INDEX idx_songs_category ON gurukul_songs(category);
CREATE INDEX idx_songs_active ON gurukul_songs(is_active);
CREATE INDEX idx_lessons_department ON lessons(department_id);
CREATE INDEX idx_lessons_section ON lessons(section_id);
CREATE INDEX idx_lessons_assigned_to ON lessons(assigned_to_user_id);

SELECT setval('departments_id_seq', COALESCE((SELECT MAX(id) FROM departments), 1), true);
SELECT setval('roles_id_seq', COALESCE((SELECT MAX(id) FROM roles), 1), true);
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);
SELECT setval('amrut_images_id_seq', COALESCE((SELECT MAX(id) FROM amrut_images), 1), true);
SELECT setval('admit_requests_id_seq', COALESCE((SELECT MAX(id) FROM admit_requests), 1), true);
SELECT setval('lessons_id_seq', COALESCE((SELECT MAX(id) FROM lessons), 1), true);
SELECT setval('applications_id_seq', COALESCE((SELECT MAX(id) FROM applications), 1), true);
SELECT setval('user_notifications_id_seq', COALESCE((SELECT MAX(id) FROM user_notifications), 1), true);
SELECT setval('gurukul_songs_id_seq', COALESCE((SELECT MAX(id) FROM gurukul_songs), 1), true);
