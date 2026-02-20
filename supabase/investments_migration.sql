-- ============================================================
-- TROCÔ — Módulo de Investimentos
-- Criação da tabela `investments` com RLS e índices
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Criar a tabela
CREATE TABLE IF NOT EXISTS public.investments (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    ticker          TEXT,
    type            TEXT NOT NULL CHECK (type IN (
                        'Ações', 'FII', 'ETF', 'BDR', 'Tesouro Direto', 'Renda Fixa', 'Debêntures',
                        'Stocks EUA', 'REITs', 'Crypto',
                        'Imóvel', 'Previdência', 'Commodities', 'Outros'
                    )),
    quantity        NUMERIC(18, 8) NOT NULL CHECK (quantity > 0),
    purchase_price  NUMERIC(18, 4) NOT NULL CHECK (purchase_price > 0),
    current_price   NUMERIC(18, 4) NOT NULL CHECK (current_price > 0),
    purchase_date   DATE NOT NULL,
    broker          TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER investments_updated_at
    BEFORE UPDATE ON public.investments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_investments_user_id       ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_type          ON public.investments(type);
CREATE INDEX IF NOT EXISTS idx_investments_purchase_date ON public.investments(purchase_date);
CREATE INDEX IF NOT EXISTS idx_investments_created_at    ON public.investments(created_at DESC);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- 5. Policies RLS — cada usuário acessa apenas seus próprios investimentos

-- Leitura (SELECT)
CREATE POLICY "investments_select_own"
    ON public.investments
    FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM public.usuarios WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Inserção (INSERT)
CREATE POLICY "investments_insert_own"
    ON public.investments
    FOR INSERT
    WITH CHECK (
        user_id IN (
            SELECT id FROM public.usuarios WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Atualização (UPDATE)
CREATE POLICY "investments_update_own"
    ON public.investments
    FOR UPDATE
    USING (
        user_id IN (
            SELECT id FROM public.usuarios WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Exclusão (DELETE)
CREATE POLICY "investments_delete_own"
    ON public.investments
    FOR DELETE
    USING (
        user_id IN (
            SELECT id FROM public.usuarios WHERE email = auth.jwt() ->> 'email'
        )
    );

-- 6. Comentários nas colunas (documentação)
COMMENT ON TABLE  public.investments                  IS 'Carteira de investimentos dos usuários do Trocô';
COMMENT ON COLUMN public.investments.id              IS 'Identificador único auto-incremental';
COMMENT ON COLUMN public.investments.user_id         IS 'FK para public.usuarios.id (dono do ativo)';
COMMENT ON COLUMN public.investments.name            IS 'Nome do ativo (ex: Petrobras PN, Tesouro Selic 2027)';
COMMENT ON COLUMN public.investments.ticker          IS 'Código/ticker do ativo (ex: PETR4, BTC) — opcional';
COMMENT ON COLUMN public.investments.type            IS 'Categoria: Ações | FII | Renda Fixa | Crypto | ETF | Internacional | Outros';
COMMENT ON COLUMN public.investments.quantity        IS 'Quantidade de cotas/unidades adquiridas';
COMMENT ON COLUMN public.investments.purchase_price  IS 'Preço unitário de compra (BRL)';
COMMENT ON COLUMN public.investments.current_price   IS 'Preço unitário atual de mercado (BRL) — atualizado manualmente';
COMMENT ON COLUMN public.investments.purchase_date   IS 'Data da compra';
COMMENT ON COLUMN public.investments.broker          IS 'Corretora utilizada (ex: XP, Rico, Clear) — opcional';
COMMENT ON COLUMN public.investments.notes           IS 'Observações livres — opcional';
COMMENT ON COLUMN public.investments.created_at      IS 'Data/hora de criação do registro';
COMMENT ON COLUMN public.investments.updated_at      IS 'Data/hora da última atualização';

-- ============================================================
-- VERIFICAÇÃO (rode após a criação para confirmar)
-- ============================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'investments'
-- ORDER BY ordinal_position;
