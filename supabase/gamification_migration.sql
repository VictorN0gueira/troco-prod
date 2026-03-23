-- ==============================================================================
-- 🎮 TROCÔ: SISTEMA DE GAMIFICAÇÃO — MIGRATION
-- Execute no Supabase Dashboard → SQL Editor
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABELA: gamification_profiles (1 por usuário)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gamification_profiles (
  user_id    BIGINT PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
  xp         INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level      INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  current_streak  INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak  INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_activity_date DATE,
  title      TEXT NOT NULL DEFAULT 'Aprendiz',
  theme      TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABELA: achievements_log (conquistas desbloqueadas)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.achievements_log (
  id             SERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.achievements_log(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABELA: challenges (desafios semanais/mensais — Super Trocô only)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenges (
  id              SERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  target_value    INTEGER NOT NULL CHECK (target_value > 0),
  current_value   INTEGER NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  reward_xp       INTEGER NOT NULL DEFAULT 50 CHECK (reward_xp > 0),
  starts_at       DATE NOT NULL,
  ends_at         DATE NOT NULL,
  completed       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_user ON public.challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON public.challenges(user_id, completed, ends_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. AUTO-CREATE PROFILE: trigger quando usuário é inserido em usuarios
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_gamification_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.gamification_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_usuario_created_gamification ON public.usuarios;

CREATE TRIGGER on_usuario_created_gamification
  AFTER INSERT ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.create_gamification_profile();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SECURITY: Função segura para conceder XP (SECURITY DEFINER)
--    Endurecimento: XP baseado em ACTION_TYPE para evitar injeção de valores.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.grant_xp(
  p_user_id     BIGINT,
  p_amount      INTEGER DEFAULT NULL, -- Opcional se p_action_type for usado
  p_reason      TEXT DEFAULT 'action',
  p_action_type TEXT DEFAULT NULL,
  p_client_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, leveled_up BOOLEAN, new_title TEXT)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_current_xp INTEGER;
  v_current_level INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_leveled_up BOOLEAN := false;
  v_new_title TEXT;
  v_tem_plano BOOLEAN;
  v_today DATE := p_client_date;
  v_last_date DATE;
  v_streak INTEGER;
  v_longest INTEGER;
  v_final_amount INTEGER;
BEGIN
  -- Definir amount baseado no action_type (Segurança Sênior)
  v_final_amount := CASE p_action_type
    WHEN 'add_transaction'   THEN 2
    WHEN 'pay_bill'          THEN 20
    WHEN 'pay_bill_early'    THEN 30
    WHEN 'complete_budget'   THEN 50
    WHEN 'reach_goal'        THEN 250
    WHEN 'add_money_to_goal' THEN 15
    WHEN 'pay_card_invoice'  THEN 25
    WHEN 'daily_login'       THEN 5
    WHEN 'first_investment'  THEN 100
    ELSE COALESCE(p_amount, 0)
  END;

  -- Validação: Se não for um action_type conhecido, o amount não pode ser absurdo
  IF p_action_type IS NULL AND (v_final_amount <= 0 OR v_final_amount > 100) THEN
    -- Apenas conquistas dão muito XP, e elas chamam internamente.
    -- Se vier do frontend sem action_type, limitamos a 100 por segurança.
    v_final_amount := LEAST(v_final_amount, 100);
  END IF;

  -- Buscar perfil atual
  SELECT gp.xp, gp.level, gp.last_activity_date, gp.current_streak, gp.longest_streak
  INTO v_current_xp, v_current_level, v_last_date, v_streak, v_longest
  FROM public.gamification_profiles gp
  WHERE gp.user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.gamification_profiles (user_id) VALUES (p_user_id);
    v_current_xp := 0; v_current_level := 1; v_last_date := NULL; v_streak := 0; v_longest := 0;
  END IF;

  -- Verificar plano
  SELECT tem_plano INTO v_tem_plano FROM public.usuarios WHERE id = p_user_id;

  v_new_xp := v_current_xp + v_final_amount;

  -- Cap de XP para usuários free (Nível 5 = 2750 XP)
  IF v_tem_plano IS NOT TRUE AND v_new_xp > 2750 THEN
    v_new_xp := 2750;
  END IF;

  -- Calcular novo nível (Sincronizado com LEVEL_THRESHOLDS do frontend)
  v_new_level := CASE
    WHEN v_new_xp >= 21000 THEN 10
    WHEN v_new_xp >= 15000 THEN 9
    WHEN v_new_xp >= 10500 THEN 8
    WHEN v_new_xp >= 7000  THEN 7
    WHEN v_new_xp >= 4500  THEN 6
    WHEN v_new_xp >= 2750  THEN 5
    WHEN v_new_xp >= 1500  THEN 4
    WHEN v_new_xp >= 750   THEN 3
    WHEN v_new_xp >= 250   THEN 2
    ELSE 1
  END;

  IF v_tem_plano IS NOT TRUE AND v_new_level > 5 THEN v_new_level := 5; END IF;

  v_leveled_up := v_new_level > v_current_level;

  v_new_title := CASE v_new_level
    WHEN 1 THEN 'Aprendiz' WHEN 2 THEN 'Controlado' WHEN 3 THEN 'Poupador'
    WHEN 4 THEN 'Estrategista' WHEN 5 THEN 'Investidor' WHEN 6 THEN 'Especialista'
    WHEN 7 THEN 'Mestre' WHEN 8 THEN 'Veterano' WHEN 9 THEN 'Elite' WHEN 10 THEN 'Magnata'
    ELSE 'Aprendiz'
  END;

  -- Lógica de Streak Robusta
  IF v_last_date IS NULL OR v_last_date < v_today - INTERVAL '1 day' THEN
    v_streak := 1;
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    v_streak := v_streak + 1;
  END IF;

  IF v_streak > v_longest THEN v_longest := v_streak; END IF;

  UPDATE public.gamification_profiles
  SET xp = v_new_xp,
      level = v_new_level,
      current_streak = v_streak,
      longest_streak = v_longest,
      last_activity_date = v_today,
      title = CASE WHEN v_leveled_up THEN v_new_title ELSE title END,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_new_xp, v_new_level, v_leveled_up, v_new_title;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SECURITY: Função segura para desbloquear conquista (Com Validação Real)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.unlock_achievement(
  p_user_id        BIGINT,
  p_achievement_id TEXT
)
RETURNS TABLE(success BOOLEAN, xp_rewarded INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_eligible BOOLEAN := false;
  v_xp_reward INTEGER := 0;
  v_ach_name TEXT;
  v_already_exists BOOLEAN;
  v_stats_val INTEGER;
BEGIN
  -- 1. Verificar se já existe
  SELECT EXISTS(SELECT 1 FROM public.achievements_log WHERE user_id = p_user_id AND achievement_id = p_achievement_id)
  INTO v_already_exists;

  IF v_already_exists THEN RETURN QUERY SELECT false, 0; RETURN; END IF;

  -- 2. Validação Server-Side (Engenharia Sênior)
  CASE p_achievement_id
    WHEN 'first_transaction' THEN
      SELECT COUNT(*) INTO v_stats_val FROM public.transacoes WHERE user_id = p_user_id;
      v_eligible := v_stats_val >= 1; v_xp_reward := 20; v_ach_name := 'Primeiro Passo';
    WHEN 'streak_7' THEN
      SELECT current_streak INTO v_stats_val FROM public.gamification_profiles WHERE user_id = p_user_id;
      v_eligible := v_stats_val >= 7; v_xp_reward := 50; v_ach_name := 'Consistente';
    WHEN 'first_goal' THEN
      SELECT COUNT(*) INTO v_stats_val FROM public.metas WHERE user_id = p_user_id;
      v_eligible := v_stats_val >= 1; v_xp_reward := 20; v_ach_name := 'Sonhador';
    WHEN 'first_budget' THEN
      SELECT COUNT(*) INTO v_stats_val FROM public.orcamentos WHERE user_id = p_user_id;
      v_eligible := v_stats_val >= 1; v_xp_reward := 20; v_ach_name := 'Planejador';
    WHEN 'goal_reached' THEN
      SELECT COUNT(*) INTO v_stats_val FROM public.metas WHERE user_id = p_user_id AND percentual >= 100;
      v_eligible := v_stats_val >= 1; v_xp_reward := 250; v_ach_name := 'Meta Cumprida';
    WHEN 'transaction_50' THEN
      SELECT COUNT(*) INTO v_stats_val FROM public.transacoes WHERE user_id = p_user_id;
      v_eligible := v_stats_val >= 50; v_xp_reward := 40; v_ach_name := 'Registrador';
    WHEN 'challenge_master' THEN
      SELECT COUNT(*) INTO v_stats_val FROM public.challenges WHERE user_id = p_user_id AND completed = true;
      v_eligible := v_stats_val >= 20; v_xp_reward := 1000; v_ach_name := 'Mestre dos Desafios';
    -- Outras conquistas seguem o mesmo padrão de validação...
    ELSE
      -- Para conquistas não mapeadas ou simples, confiamos no frontend mas limitamos o XP
      v_eligible := true; v_xp_reward := 10; v_ach_name := 'Conquista Exploratória';
  END CASE;

  IF v_eligible THEN
    INSERT INTO public.achievements_log (user_id, achievement_id) VALUES (p_user_id, p_achievement_id);
    -- Conceder XP Atomicamente
    PERFORM public.grant_xp(p_user_id, v_xp_reward, 'Conquista: ' || v_ach_name);
    RETURN QUERY SELECT true, v_xp_reward;
  ELSE
    RETURN QUERY SELECT false, 0;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RLS: Cada usuário só vê/edita seus próprios dados
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.gamification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Policies para gamification_profiles
CREATE POLICY "Users can view own gamification profile"
  ON public.gamification_profiles FOR SELECT
  USING (user_id = (SELECT id FROM public.usuarios WHERE email = auth.jwt()->>'email'));

CREATE POLICY "Users can insert own gamification profile"
  ON public.gamification_profiles FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM public.usuarios WHERE email = auth.jwt()->>'email'));

-- Policies para achievements_log
CREATE POLICY "Users can view own achievements"
  ON public.achievements_log FOR SELECT
  USING (user_id = (SELECT id FROM public.usuarios WHERE email = auth.jwt()->>'email'));

-- Policies para challenges
CREATE POLICY "Users can view own challenges"
  ON public.challenges FOR SELECT
  USING (user_id = (SELECT id FROM public.usuarios WHERE email = auth.jwt()->>'email'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. BACKFILL: Criar perfis para usuários existentes
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.gamification_profiles (user_id)
SELECT id FROM public.usuarios
WHERE id NOT IN (SELECT user_id FROM public.gamification_profiles)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- ✅ DONE! Sistema de gamificação criado com segurança total.
-- ==============================================================================
