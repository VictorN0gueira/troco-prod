-- ==============================================================================
-- 🛡️ TROCÔ: BACKEND SECURITY LIMITS (MULTI-TIER PLAN SYSTEM)
-- Execute this script in your Supabase Dashboard -> SQL Editor.
-- ==============================================================================

-- 1. Create a function to check limits before inserting into transacoes
CREATE OR REPLACE FUNCTION public.check_free_tier_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plano text;
  v_transaction_count integer;
  v_reminder_count integer;
  v_recurring_count integer;
  v_month_prefix text;
BEGIN
  -- 1. Get the user's plan status from public.usuarios
  SELECT COALESCE(plano, 'FREE') INTO v_plano
  FROM public.usuarios
  WHERE id = NEW.user_id;

  -- If the user has a paid plan (ESSENCIAL, INTELIGENTE, PREMIUM), allow unlimited transactions
  IF v_plano != 'FREE' THEN
    RETURN NEW;
  END IF;

  -- ==========================================================
  -- LIMIT CHECK 1: Max 5 Active Reminders
  -- ==========================================================
  SELECT COUNT(*) INTO v_reminder_count
  FROM public.transacoes
  WHERE user_id = NEW.user_id AND esta_pago = false;

  IF NEW.esta_pago = false AND TG_OP = 'INSERT' THEN
    IF v_reminder_count >= 5 THEN
      RAISE EXCEPTION 'Limites do Plano: O plano FREE permite no máximo 5 lembretes ativos.';
    END IF;
  END IF;

  -- ==========================================================
  -- LIMIT CHECK 2: Max 15 Transactions Per Month
  -- ==========================================================
  v_month_prefix := to_char(NEW.data::date, 'YYYY-MM');

  SELECT COUNT(*) INTO v_transaction_count
  FROM public.transacoes
  WHERE user_id = NEW.user_id 
    AND to_char(data::date, 'YYYY-MM') = v_month_prefix;

  IF v_transaction_count >= 15 AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Limites do Plano: O plano FREE permite no máximo 15 lançamentos por mês.';
  END IF;

  -- ==========================================================
  -- LIMIT CHECK 3: Max 3 Subscriptions (Recurring)
  -- ==========================================================
  SELECT COUNT(*) INTO v_recurring_count
  FROM public.transacoes
  WHERE user_id = NEW.user_id AND is_recurring = true;

  IF NEW.is_recurring = true AND TG_OP = 'INSERT' THEN
    IF v_recurring_count >= 3 THEN
      RAISE EXCEPTION 'Limites do Plano: O plano FREE permite no máximo 3 assinaturas/lançamentos recorrentes.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Attach the trigger to the transacoes table
DROP TRIGGER IF EXISTS enforce_free_tier_limits ON public.transacoes;

CREATE TRIGGER enforce_free_tier_limits
  BEFORE INSERT ON public.transacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_free_tier_limits();

-- ==============================================================================
-- 3. Create a function to check limits before inserting into credit_cards
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_free_tier_card_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plano text;
  v_card_count integer;
BEGIN
  -- Get the user's plan status
  SELECT COALESCE(plano, 'FREE') INTO v_plano
  FROM public.usuarios
  WHERE id = NEW.user_id;

  -- If paid plan, allow unlimited
  IF v_plano != 'FREE' THEN
    RETURN NEW;
  END IF;

  -- Count existing cards
  SELECT COUNT(*) INTO v_card_count
  FROM public.credit_cards
  WHERE user_id = NEW.user_id;

  IF v_card_count >= 2 THEN
    RAISE EXCEPTION 'Limites do Plano: O plano FREE permite no máximo 2 cartões de crédito.';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Attach the trigger to the credit_cards table
DROP TRIGGER IF EXISTS enforce_free_tier_card_limits ON public.credit_cards;

CREATE TRIGGER enforce_free_tier_card_limits
  BEFORE INSERT ON public.credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.check_free_tier_card_limits();

-- ==============================================================================
-- 5. Create a function to check limits before inserting into metas (goals)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_free_tier_goal_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plano text;
  v_goal_count integer;
BEGIN
  SELECT COALESCE(plano, 'FREE') INTO v_plano
  FROM public.usuarios
  WHERE id = NEW.user_id;

  IF v_plano != 'FREE' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_goal_count
  FROM public.metas
  WHERE user_id = NEW.user_id;

  IF v_goal_count >= 3 THEN
    RAISE EXCEPTION 'Limites do Plano: O plano FREE permite no máximo 3 metas financeiras.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_free_tier_goal_limits ON public.metas;

CREATE TRIGGER enforce_free_tier_goal_limits
  BEFORE INSERT ON public.metas
  FOR EACH ROW
  EXECUTE FUNCTION public.check_free_tier_goal_limits();


-- ==============================================================================
-- 6. Create a function to check limits before inserting into contas_bancarias
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_free_tier_account_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plano text;
  v_account_count integer;
BEGIN
  SELECT COALESCE(plano, 'FREE') INTO v_plano
  FROM public.usuarios
  WHERE id = NEW.user_id;

  IF v_plano != 'FREE' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_account_count
  FROM public.contas_bancarias
  WHERE user_id = NEW.user_id;

  IF v_account_count >= 2 THEN
    RAISE EXCEPTION 'Limites do Plano: O plano FREE permite no máximo 2 contas bancárias.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_free_tier_account_limits ON public.contas_bancarias;

CREATE TRIGGER enforce_free_tier_account_limits
  BEFORE INSERT ON public.contas_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION public.check_free_tier_account_limits();

-- ==============================================================================
-- 7. Create a function to check and increment AI usage (called by n8n or app)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_and_increment_ai_usage(p_user_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plano text;
  v_ai_messages_month integer;
  v_last_date timestamp with time zone;
  v_limit integer;
BEGIN
  -- Get user data
  SELECT COALESCE(plano, 'FREE'), COALESCE(ai_messages_month, 0), last_ai_message_date
  INTO v_plano, v_ai_messages_month, v_last_date
  FROM public.usuarios
  WHERE id = p_user_id;

  -- Reset counter if month changed
  IF v_last_date IS NULL OR to_char(v_last_date, 'YYYY-MM') != to_char(now(), 'YYYY-MM') THEN
    v_ai_messages_month := 0;
  END IF;

  -- Determine limit
  IF v_plano = 'FREE' THEN
    v_limit := 0;
  ELSIF v_plano = 'ESSENCIAL' THEN
    v_limit := 100;
  ELSIF v_plano = 'INTELIGENTE' THEN
    v_limit := 400;
  ELSIF v_plano = 'PREMIUM' THEN
    v_limit := 1000;
  ELSE
    v_limit := 0; -- Fallback
  END IF;

  -- Check limit
  IF v_ai_messages_month >= v_limit THEN
    -- Limit reached
    RETURN false;
  END IF;

  -- Increment and update
  UPDATE public.usuarios
  SET ai_messages_month = v_ai_messages_month + 1,
      last_ai_message_date = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

-- ✅ DONE! Planos e Limites de Inteligência Artificial e Restrições de Banco de Dados configurados.
-- ==============================================================================
