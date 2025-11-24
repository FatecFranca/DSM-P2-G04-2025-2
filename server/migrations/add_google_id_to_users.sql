-- Migração para adicionar suporte ao login Google
-- Adicionar campo google_id na tabela users

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Criar índice para melhorar performance das consultas por google_id
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Atualizar usuários existentes para ter email_verified = true se tiverem senha
UPDATE users SET email_verified = true WHERE password_hash IS NOT NULL;

-- Comentário sobre a migração
COMMENT ON COLUMN users.google_id IS 'ID único do usuário no Google OAuth';
COMMENT ON COLUMN users.email_verified IS 'Indica se o email foi verificado (Google OAuth ou verificação manual)';
