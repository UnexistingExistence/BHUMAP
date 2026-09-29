-- PostgreSQL Schema for BhuMap User Management
CREATE TYPE user_role AS ENUM ('SURVEYOR', 'ADMIN', 'GOVT_OFFICIAL', 'VIEWER');
CREATE TYPE auth_provider AS ENUM ('CREDENTIALS', 'GOOGLE');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role user_role DEFAULT 'SURVEYOR' NOT NULL,
    provider auth_provider DEFAULT 'CREDENTIALS' NOT NULL,
    organization VARCHAR(150),
    surveyor_license_id VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);