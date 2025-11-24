-- Script para criar tabela de estabelecimentos gastronômicos
-- Este é um complemento ao banco existente do BeastFood

-- Conectar ao banco beastfood
\c beastfood;

-- Habilitar extensões necessárias (caso não estejam)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- Para busca por similaridade

-- Criar tabela de estabelecimentos gastronômicos
CREATE TABLE IF NOT EXISTS estabelecimentos (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT UNIQUE, -- ID do OpenStreetMap se vier de lá
    nome VARCHAR(200) NOT NULL,
    tipo VARCHAR(100) NOT NULL, -- restaurant, cafe, fast_food, bar, etc.
    endereco TEXT,
    telefone VARCHAR(20),
    cidade VARCHAR(100) DEFAULT 'Franca',
    estado VARCHAR(2) DEFAULT 'SP',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geom GEOMETRY(POINT, 4326), -- Geometria para PostGIS
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW() -- Para compatibilidade com a API
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_nome ON estabelecimentos USING GIN (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_tipo ON estabelecimentos(tipo);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_cidade ON estabelecimentos(cidade);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_geom ON estabelecimentos USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_lat_lng ON estabelecimentos(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_updated ON estabelecimentos(updated_at);

-- Trigger para atualizar automaticamente a geometria quando lat/lng mudarem
CREATE OR REPLACE FUNCTION update_estabelecimento_geom()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar timestamp
    NEW.updated_at = NOW();
    NEW.atualizado_em = NOW();
    
    -- Atualizar geometria se latitude e longitude existirem
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_update_estabelecimento_geom ON estabelecimentos;
CREATE TRIGGER trigger_update_estabelecimento_geom
    BEFORE INSERT OR UPDATE ON estabelecimentos
    FOR EACH ROW
    EXECUTE FUNCTION update_estabelecimento_geom();

-- Inserir dados de exemplo para teste
INSERT INTO estabelecimentos (osm_id, nome, tipo, endereco, telefone, latitude, longitude) VALUES
(1001, 'Restaurante Tempero Caseiro', 'restaurant', 'Rua Voluntários da Pátria, 1234, Centro', '(16) 3721-1234', -20.5386, -47.4008),
(1002, 'Pizzaria Bella Napoli', 'restaurant', 'Av. Major Nicácio, 567, Centro', '(16) 3722-5678', -20.5400, -47.4020),
(1003, 'Café da Praça', 'cafe', 'Praça Nossa Senhora da Conceição, 89', '(16) 3723-9876', -20.5350, -47.3990),
(1004, 'Lanchonete do João', 'fast_food', 'Rua General Carneiro, 321', '(16) 3724-4567', -20.5420, -47.4050),
(1005, 'Bar e Petiscaria Central', 'bar', 'Rua Frederico Moura, 445', '(16) 3725-7890', -20.5380, -47.4010),
(1006, 'Sorveteria Gelato', 'ice_cream', 'Av. Dr. Flávio Rocha, 789', '(16) 3726-2345', -20.5390, -47.4030),
(1007, 'Churrascaria Gaúcha', 'restaurant', 'Rua Coronel Arantes, 555', '(16) 3727-6789', -20.5410, -47.4040),
(1008, 'Sushi House', 'restaurant', 'Av. Champagnat, 888', '(16) 3728-1357', -20.5370, -47.4000),
(1009, 'Doceria Doce Mel', 'bakery', 'Rua Marechal Deodoro, 222', '(16) 3729-2468', -20.5360, -47.3980),
(1010, 'Restaurante Vegetariano Verde Vida', 'restaurant', 'Rua São Benedito, 333', '(16) 3730-3579', -20.5440, -47.4060)
ON CONFLICT (osm_id) DO NOTHING;

-- Verificar se os dados foram inseridos
SELECT 'Estabelecimentos inseridos com sucesso!' as status;
SELECT COUNT(*) as total_estabelecimentos FROM estabelecimentos;
SELECT tipo, COUNT(*) as quantidade FROM estabelecimentos GROUP BY tipo ORDER BY quantidade DESC;

-- Mostrar alguns registros de exemplo
SELECT id, nome, tipo, endereco, latitude, longitude 
FROM estabelecimentos 
ORDER BY nome 
LIMIT 5;

