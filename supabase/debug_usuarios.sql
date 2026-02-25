-- ==============================================================================
-- 🔍 TROCÔ: DEBUGGING THE USERS TABLE
-- ==============================================================================
-- O Erro 500 acontece porque alguma coluna na tabela `usuarios` é OBRIGATÓRIA
-- (NOT NULL) e o nosso gatilho não está preenchendo ela (ex: `telefone`).
-- 
-- Rode o comando abaixo, tire um print do resultado e mande pra mim!
-- Isso vai me falar exatamente qual coluna está faltando.
-- ==============================================================================

SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'usuarios'
ORDER BY ordinal_position;
