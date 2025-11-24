-- Script para configurar Google Places no BeastFood
-- Execute este script no PostgreSQL para criar a tabela de estabelecimentos do Google Places

-- Conectar ao banco beastfood
\c beastfood;

-- Habilitar extensões necessárias (caso não estejam)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Criar tabela para estabelecimentos do Google Places
CREATE TABLE IF NOT EXISTS estabelecimentos_google (
    place_id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL,
    endereco TEXT,
    cidade TEXT DEFAULT 'Franca',
    estado TEXT DEFAULT 'SP',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geom GEOMETRY(Point, 4326),
    rating DECIMAL(2,1),
    user_ratings_total INTEGER,
    price_level INTEGER,
    photo_reference TEXT,
    opening_hours JSONB,
    phone_number TEXT,
    website TEXT,
    google_url TEXT,
    business_status TEXT,
    permanently_closed BOOLEAN DEFAULT false,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_google_geom ON estabelecimentos_google USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_google_nome ON estabelecimentos_google USING GIN (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_google_tipo ON estabelecimentos_google(tipo);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_google_cidade ON estabelecimentos_google(cidade);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_google_rating ON estabelecimentos_google(rating);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_google_updated ON estabelecimentos_google(atualizado_em);

-- Trigger para atualizar automaticamente a geometria quando lat/lng mudarem
CREATE OR REPLACE FUNCTION update_estabelecimento_google_geom()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar timestamp
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    
    -- Atualizar geometria se latitude e longitude existirem
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_update_estabelecimento_google_geom ON estabelecimentos_google;
CREATE TRIGGER trigger_update_estabelecimento_google_geom
    BEFORE INSERT OR UPDATE ON estabelecimentos_google
    FOR EACH ROW
    EXECUTE FUNCTION update_estabelecimento_google_geom();

-- Criar view unificada de todos os estabelecimentos
CREATE OR REPLACE VIEW estabelecimentos_unificados AS
SELECT 
    'manual'::text as fonte,
    id::text as identificador,
    osm_id::text as id_externo,
    nome,
    tipo,
    endereco,
    cidade,
    latitude,
    longitude,
    geom,
    NULL::decimal as rating,
    NULL::integer as user_ratings_total,
    telefone,
    NULL::text as website,
    created_at as criado_em,
    updated_at as atualizado_em
FROM estabelecimentos

UNION ALL

SELECT 
    'google'::text as fonte,
    place_id as identificador,
    place_id as id_externo,
    nome,
    tipo,
    endereco,
    cidade,
    latitude,
    longitude,
    geom,
    rating,
    user_ratings_total,
    phone_number as telefone,
    website,
    criado_em,
    atualizado_em
FROM estabelecimentos_google
WHERE NOT permanently_closed;

-- Função para buscar estabelecimentos próximos (view unificada)
CREATE OR REPLACE FUNCTION buscar_estabelecimentos_proximos(
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    raio_metros INTEGER DEFAULT 2000,
    limite INTEGER DEFAULT 50
)
RETURNS TABLE (
    fonte TEXT,
    identificador TEXT,
    nome TEXT,
    tipo TEXT,
    endereco TEXT,
    cidade TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    rating DECIMAL,
    distancia_metros DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.fonte,
        e.identificador,
        e.nome,
        e.tipo,
        e.endereco,
        e.cidade,
        e.latitude,
        e.longitude,
        e.rating,
        ST_Distance(e.geom::geography, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography) as distancia_metros
    FROM estabelecimentos_unificados e
    WHERE ST_DWithin(e.geom::geography, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, raio_metros)
    ORDER BY distancia_metros ASC
    LIMIT limite;
END;
$$ LANGUAGE plpgsql;

-- Verificar se tudo foi criado corretamente
SELECT 'Estrutura Google Places criada com sucesso!' as status;

-- Mostrar estatísticas
SELECT 
    'Tabela estabelecimentos_google' as tabela,
    COUNT(*) as total_registros
FROM estabelecimentos_google
UNION ALL
SELECT 
    'Tabela estabelecimentos (manual)' as tabela,
    COUNT(*) as total_registros
FROM estabelecimentos;

-- Mostrar estrutura da tabela
\d estabelecimentos_google;

