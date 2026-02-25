-- ==============================================================================
-- 🔍 TROCÔ: DEBUGGING THE TRIGGER CRASH
-- ==============================================================================
-- Vamos descobrir exatamente a mensagem de erro original que o Postgres
-- está tentando falar (mas que o Auth esconde como "Error 500").
-- 
-- Para isso, rode esse gatilho modificado. Ele força a inserção, mas
-- se falhar, ELE VAI GRAVAR O ERRO numa tabela de log pra gente ler!
-- ==============================================================================

-- 1. Cria a tabela de Logs Temporária (só pra testes)
CREATE TABLE IF NOT EXISTS public.trigger_logs (
    id SERIAL PRIMARY KEY,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Recria a função com o famoso bloco TRY/CATCH do Postgres
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.usuarios (email, nome, password, tem_plano)
    VALUES (
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.encrypted_password,
      false
    )
    ON CONFLICT (email) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- AQUI ESTÁ O SEGREDO: Salva o erro real!
    INSERT INTO public.trigger_logs (error_message) VALUES (SQLERRM);
  END;

  RETURN NEW;
END;
$$;
