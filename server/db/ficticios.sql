-- BeastFood Database Seed
-- Popula o banco com dados de exemplo

-- Inserir usuários de exemplo
INSERT INTO users (name, username, email, password_hash, bio, profile_picture) VALUES
('João Silva', 'joaosilva', 'joao@email.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.s7mG', 'Amante de comida italiana e japonesa', 'https://via.placeholder.com/150'),
('Maria Santos', 'mariasantos', 'maria@email.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.s7mG', 'Foodie e fotógrafa de comida', 'https://via.placeholder.com/150'),
('Pedro Costa', 'pedrocosta', 'pedro@email.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.s7mG', 'Chef amador e crítico gastronômico', 'https://via.placeholder.com/150'),
('Ana Oliveira', 'anaoliveira', 'ana@email.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.s7mG', 'Explorando novos sabores', 'https://via.placeholder.com/150')
ON CONFLICT (username) DO NOTHING;

-- Inserir restaurantes de exemplo (São Paulo)
INSERT INTO restaurants (name, description, address, phone, website, cuisine_type, price_range, location) VALUES
('Pizzaria Bella Italia', 'Autêntica pizza italiana com forno a lenha', 'Rua Augusta, 123 - São Paulo', '(11) 99999-9999', 'https://bellaitalia.com', 'Italiana', 3, ST_SetSRID(ST_MakePoint(-46.6388, -23.5489), 4326)),
('Sushi Bar Tokyo', 'Sushi tradicional japonês com peixe fresco', 'Av. Paulista, 456 - São Paulo', '(11) 88888-8888', 'https://tokyobar.com', 'Japonesa', 4, ST_SetSRID(ST_MakePoint(-46.6556, -23.5618), 4326)),
('Churrascaria Gaúcha', 'Churrasco brasileiro com buffet completo', 'Rua Oscar Freire, 789 - São Paulo', '(11) 77777-7777', 'https://gauchabbq.com', 'Brasileira', 4, ST_SetSRID(ST_MakePoint(-46.6684, -23.5670), 4326)),
('Padaria Artesanal', 'Pães artesanais e doces caseiros', 'Rua Haddock Lobo, 321 - São Paulo', '(11) 66666-6666', 'https://padariaartesanal.com', 'Padaria', 2, ST_SetSRID(ST_MakePoint(-46.6612, -23.5589), 4326)),
('Hambúrguer Gourmet', 'Hambúrgueres artesanais com ingredientes premium', 'Rua Bela Cintra, 654 - São Paulo', '(11) 55555-5555', 'https://gourmetburger.com', 'Fast Food', 3, ST_SetSRID(ST_MakePoint(-46.6645, -23.5612), 4326))
ON CONFLICT DO NOTHING;

-- Inserir posts de exemplo
INSERT INTO posts (user_id, restaurant_id, content, rating) VALUES
(1, 1, 'Pizza incrível! Massa perfeita e ingredientes de qualidade. Recomendo a Margherita!', 5),
(2, 2, 'Sushi fresquíssimo e atendimento impecável. O combo sashimi estava perfeito!', 5),
(3, 3, 'Churrasco tradicional gaúcho. Carnes suculentas e buffet variado. Vale a pena!', 4),
(4, 4, 'Pães artesanais deliciosos! Crocantes por fora e macios por dentro.', 5),
(1, 5, 'Hambúrguer gourmet surpreendente. Pão brioche e carne bem temperada.', 4),
(2, 1, 'Segunda vez aqui e continua excelente. A pizza quatro queijos é divina!', 5),
(3, 2, 'Experiência japonesa autêntica. Preços justos para a qualidade.', 4)
ON CONFLICT DO NOTHING;

-- Inserir fotos dos posts
INSERT INTO post_photos (post_id, photo_url, thumbnail_url, alt_text) VALUES
(1, 'https://via.placeholder.com/800x600/FF6B6B/FFFFFF?text=Pizza+Margherita', 'https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=Pizza+Margherita', 'Pizza Margherita da Bella Italia'),
(2, 'https://via.placeholder.com/800x600/4ECDC4/FFFFFF?text=Sushi+Combo', 'https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=Sushi+Combo', 'Combo Sashimi do Tokyo Bar'),
(3, 'https://via.placeholder.com/800x600/45B7D1/FFFFFF?text=Churrasco', 'https://via.placeholder.com/300x200/45B7D1/FFFFFF?text=Churrasco', 'Churrasco da Churrascaria Gaúcha'),
(4, 'https://via.placeholder.com/800x600/96CEB4/FFFFFF?text=Pães+Artesanais', 'https://via.placeholder.com/300x200/96CEB4/FFFFFF?text=Pães+Artesanais', 'Pães artesanais da padaria'),
(5, 'https://via.placeholder.com/800x600/FFEAA7/FFFFFF?text=Hambúrguer+Gourmet', 'https://via.placeholder.com/300x200/FFEAA7/FFFFFF?text=Hambúrguer+Gourmet', 'Hambúrguer gourmet artesanal')
ON CONFLICT DO NOTHING;

-- Inserir comentários
INSERT INTO comments (post_id, user_id, content) VALUES
(1, 2, 'Que pizza linda! Preciso experimentar essa!'),
(1, 3, 'Concordo, a Bella Italia é uma das melhores da cidade'),
(2, 1, 'Sushi sempre é uma boa escolha!'),
(3, 4, 'Adoro churrasco! Vou marcar para ir lá'),
(4, 1, 'Pães artesanais são sempre melhores que os industriais'),
(5, 2, 'Hambúrguer gourmet é uma experiência única!')
ON CONFLICT DO NOTHING;

-- Inserir curtidas
INSERT INTO likes (post_id, user_id) VALUES
(1, 2), (1, 3), (1, 4),
(2, 1), (2, 3), (2, 4),
(3, 1), (3, 2), (3, 4),
(4, 1), (4, 2), (4, 3),
(5, 1), (5, 2), (5, 4)
ON CONFLICT DO NOTHING;

-- Inserir favoritos
INSERT INTO favorites (user_id, restaurant_id) VALUES
(1, 1), (1, 2),
(2, 2), (2, 4),
(3, 3), (3, 1),
(4, 4), (4, 5)
ON CONFLICT DO NOTHING;

-- Inserir seguidores
INSERT INTO follows (follower_id, following_id) VALUES
(1, 2), (1, 3),
(2, 1), (2, 4),
(3, 1), (3, 2),
(4, 1), (4, 3)
ON CONFLICT DO NOTHING;
