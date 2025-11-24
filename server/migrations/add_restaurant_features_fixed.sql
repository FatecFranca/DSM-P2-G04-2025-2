-- Migração corrigida para adicionar funcionalidades aos restaurantes
-- Opções de serviços, highlights e horários de funcionamento

-- 1. Criar tabela para opções de serviços
CREATE TABLE IF NOT EXISTS restaurant_services (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL, -- 'delivery', 'reservas', 'takeaway', 'dine_in'
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id, service_type)
);

-- 2. Criar tabela para highlights dos restaurantes
CREATE TABLE IF NOT EXISTS restaurant_highlights (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    highlight_text VARCHAR(100) NOT NULL, -- 'Ambiente familiar', 'Boa localização', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Criar tabela para horários de funcionamento
CREATE TABLE IF NOT EXISTS restaurant_operating_hours (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=domingo, 1=segunda, etc.
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id, day_of_week)
);

-- 4. Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_restaurant_services_restaurant_id ON restaurant_services(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_highlights_restaurant_id ON restaurant_highlights(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_operating_hours_restaurant_id ON restaurant_operating_hours(restaurant_id);

-- 5. Inserir dados de exemplo para restaurantes existentes
-- Opções de serviços padrão
INSERT INTO restaurant_services (restaurant_id, service_type, is_available) 
SELECT id, 'delivery', false FROM restaurants 
ON CONFLICT (restaurant_id, service_type) DO NOTHING;

INSERT INTO restaurant_services (restaurant_id, service_type, is_available) 
SELECT id, 'reservas', false FROM restaurants 
ON CONFLICT (restaurant_id, service_type) DO NOTHING;

-- Highlights padrão
INSERT INTO restaurant_highlights (restaurant_id, highlight_text, is_active) 
SELECT id, 'Boa localização', false FROM restaurants 
ON CONFLICT DO NOTHING;

INSERT INTO restaurant_highlights (restaurant_id, highlight_text, is_active) 
SELECT id, 'Ambiente familiar', false FROM restaurants 
ON CONFLICT DO NOTHING;

-- Horários padrão (segunda a sexta, 11:00-22:00)
INSERT INTO restaurant_operating_hours (restaurant_id, day_of_week, open_time, close_time, is_closed) 
SELECT id, 1, '11:00:00', '22:00:00', false FROM restaurants 
ON CONFLICT (restaurant_id, day_of_week) DO NOTHING;

INSERT INTO restaurant_operating_hours (restaurant_id, day_of_week, open_time, close_time, is_closed) 
SELECT id, 2, '11:00:00', '22:00:00', false FROM restaurants 
ON CONFLICT (restaurant_id, day_of_week) DO NOTHING;

INSERT INTO restaurant_operating_hours (restaurant_id, day_of_week, open_time, close_time, is_closed) 
SELECT id, 3, '11:00:00', '22:00:00', false FROM restaurants 
ON CONFLICT (restaurant_id, day_of_week) DO NOTHING;

INSERT INTO restaurant_operating_hours (restaurant_id, day_of_week, open_time, close_time, is_closed) 
SELECT id, 4, '11:00:00', '22:00:00', false FROM restaurants 
ON CONFLICT (restaurant_id, day_of_week) DO NOTHING;

INSERT INTO restaurant_operating_hours (restaurant_id, day_of_week, open_time, close_time, is_closed) 
SELECT id, 5, '11:00:00', '22:00:00', false FROM restaurants 
ON CONFLICT (restaurant_id, day_of_week) DO NOTHING;

-- Fim de semana (sábado e domingo)
INSERT INTO restaurant_operating_hours (restaurant_id, day_of_week, open_time, close_time, is_closed) 
SELECT id, 6, '11:00:00', '23:00:00', false FROM restaurants 
ON CONFLICT (restaurant_id, day_of_week) DO NOTHING;

INSERT INTO restaurant_operating_hours (restaurant_id, day_of_week, open_time, close_time, is_closed) 
SELECT id, 0, '11:00:00', '22:00:00', false FROM restaurants 
ON CONFLICT (restaurant_id, day_of_week) DO NOTHING;

-- 6. Criar função para verificar se restaurante está aberto (corrigida)
CREATE OR REPLACE FUNCTION is_restaurant_open(restaurant_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_day INTEGER;
    current_time_local TIME;
    operating_hour RECORD;
BEGIN
    -- Obter dia da semana atual (0=domingo, 1=segunda, etc.)
    current_day := EXTRACT(DOW FROM NOW() AT TIME ZONE 'America/Sao_Paulo');
    current_time_local := (NOW() AT TIME ZONE 'America/Sao_Paulo')::TIME;
    
    -- Buscar horário de funcionamento para o dia atual
    SELECT * INTO operating_hour 
    FROM restaurant_operating_hours 
    WHERE restaurant_id = restaurant_id_param 
    AND day_of_week = current_day;
    
    -- Se não encontrou horário ou está fechado
    IF operating_hour IS NULL OR operating_hour.is_closed THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se está dentro do horário de funcionamento
    RETURN current_time_local >= operating_hour.open_time AND current_time_local <= operating_hour.close_time;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar view para facilitar consultas
CREATE OR REPLACE VIEW restaurant_status AS
SELECT 
    r.id,
    r.name,
    r.address,
    is_restaurant_open(r.id) as is_open,
    CASE 
        WHEN is_restaurant_open(r.id) THEN 'Aberto'
        ELSE 'Fechado'
    END as status_text,
    CASE 
        WHEN is_restaurant_open(r.id) THEN 'green'
        ELSE 'red'
    END as status_color,
    oh.open_time,
    oh.close_time,
    oh.is_closed
FROM restaurants r
LEFT JOIN restaurant_operating_hours oh ON r.id = oh.restaurant_id 
    AND oh.day_of_week = EXTRACT(DOW FROM NOW() AT TIME ZONE 'America/Sao_Paulo');

-- Comentários para documentação
COMMENT ON TABLE restaurant_services IS 'Opções de serviços disponíveis nos restaurantes (delivery, reservas, etc.)';
COMMENT ON TABLE restaurant_highlights IS 'Pontos positivos/destaques dos restaurantes';
COMMENT ON TABLE restaurant_operating_hours IS 'Horários de funcionamento dos restaurantes';
COMMENT ON FUNCTION is_restaurant_open IS 'Função para verificar se um restaurante está aberto no momento atual (UTC-3)';
COMMENT ON VIEW restaurant_status IS 'View para consultar status atual dos restaurantes (aberto/fechado)';



