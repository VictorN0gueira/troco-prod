-- Tabela para notícias salvas (bookmarks)
CREATE TABLE IF NOT EXISTS saved_news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  source TEXT,
  source_color TEXT,
  category TEXT,
  sentiment TEXT,
  timestamp TEXT,
  saved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, url)
);

-- RLS: cada usuário só vê as próprias notícias salvas
ALTER TABLE saved_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved news" ON saved_news
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índice para busca rápida por usuário
CREATE INDEX idx_saved_news_user_id ON saved_news(user_id);
CREATE INDEX idx_saved_news_saved_at ON saved_news(user_id, saved_at DESC);
