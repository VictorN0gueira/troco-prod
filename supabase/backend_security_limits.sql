-- ==============================================================================
-- 🛡️ TROCÔ: BACKEND SECURITY LIMITS (SUPER TROCÔ PAYWALL)
-- Execute this script in your Supabase Dashboard -> SQL Editor.
-- ==============================================================================

-- 1. Create a function to check limits before inserting into transacoes
CREATE OR REPLACE FUNCTION public.check_free_tier_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tem_plano boolean;
  v_transaction_count integer;
  v_reminder_count integer;
  v_month_prefix text;
BEGIN
  -- 1. Get the user's plan status from public.usuarios
  -- NEW.user_id points to usuarios.id
  SELECT tem_plano INTO v_tem_plano
  FROM public.usuarios
  WHERE id = NEW.user_id;

  -- If the user has a plan (Super Trocô), allow unlimited
  IF v_tem_plano = true THEN
    RETURN NEW;
  END IF;

  -- ==========================================================
  -- LIMIT CHECK 1: Max 10 Active Reminders
  -- ==========================================================
  -- A reminder is identified by esta_pago = false
  -- LIMIT CHECK 1: Max 5 Active Reminders
  SELECT COUNT(*) INTO v_reminder_count
  FROM public.transacoes
  WHERE user_id = NEW.user_id AND esta_pago = false;

  IF NEW.esta_pago = false AND TG_OP = 'INSERT' THEN
    IF v_reminder_count >= 5 THEN
      RAISE EXCEPTION 'Limites do Plano: O plano gratuito permite no máximo 5 lembretes ativos.';
    END IF;
  END IF;

  -- ==========================================================
  -- LIMIT CHECK 2: Max 30 Transactions Per Month
  -- ==========================================================
  -- Check transactions matching the same YYYY-MM prefix as the new insert date
  v_month_prefix := to_char(NEW.data::date, 'YYYY-MM');

  SELECT COUNT(*) INTO v_transaction_count
  FROM public.transacoes
  WHERE user_id = NEW.user_id 
    AND to_char(data::date, 'YYYY-MM') = v_month_prefix;

  IF v_transaction_count >= 30 THEN
    RAISE EXCEPTION 'Limites do Plano: O plano gratuito permite no máximo 30 lançamentos por mês.';
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
  v_tem_plano boolean;
  v_card_count integer;
BEGIN
  -- Get the user's plan status
  SELECT tem_plano INTO v_tem_plano
  FROM public.usuarios
  WHERE id = NEW.user_id;

  -- If Super Trocô, allow unlimited
  IF v_tem_plano = true THEN
    RETURN NEW;
  END IF;

  -- Count existing cards
  SELECT COUNT(*) INTO v_card_count
  FROM public.credit_cards
  WHERE user_id = NEW.user_id;

  IF v_card_count >= 2 THEN
    RAISE EXCEPTION 'Limites do Plano: O plano gratuito permite no máximo 2 cartões de crédito.';
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
-- ✅ DONE! Agora é matematicamente impossível fraudar os limites pelo Frontend.
-- ==============================================================================
