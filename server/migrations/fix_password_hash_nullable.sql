-- Migração para corrigir a coluna password_hash para usuários Google
-- Tornar password_hash opcional (nullable) para permitir usuários sem senha

-- Remover a restrição NOT NULL da coluna password_hash
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Adicionar uma restrição CHECK para garantir que usuários tenham OU password_hash OU google_id
ALTER TABLE users ADD CONSTRAINT check_user_authentication 
CHECK (
  (password_hash IS NOT NULL) OR 
  (google_id IS NOT NULL)
);

-- Comentário sobre a migração
COMMENT ON CONSTRAINT check_user_authentication ON users IS 'Usuários devem ter OU senha OU Google ID para autenticação';

-- Atualizar comentário da coluna
COMMENT ON COLUMN users.password_hash IS 'Hash da senha (opcional para usuários Google)';
