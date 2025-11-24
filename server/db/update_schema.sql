-- Script para atualizar o banco de dados existente
-- Execute este script se o banco já existir

-- Adicionar campos na tabela restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'OSM';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS source_id VARCHAR(100);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS main_photo_url VARCHAR(500);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);

-- Adicionar campo role na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Adicionar constraint se não existir (PostgreSQL não suporta IF NOT EXISTS para constraints)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_role') THEN
        ALTER TABLE users ADD CONSTRAINT check_role CHECK (role IN ('user', 'owner', 'admin'));
    END IF;
END $$;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_source ON restaurants(source_type, source_id);

-- Atualizar usuários existentes para ter role 'user'
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Definir o primeiro usuário como admin (se necessário)
-- UPDATE users SET role = 'admin' WHERE id = 1;
