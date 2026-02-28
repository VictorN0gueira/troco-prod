import { createClient } from '@supabase/supabase-js';

// Define types for import.meta.env to satisfy TypeScript
declare global {
  interface ImportMeta {
    env: {
      [key: string]: string | undefined;
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_KEY?: string;
    };
  }
}

// --- CONFIGURAÇÃO DE CREDENCIAIS ---
// As credenciais DEVEM ser definidas nas variáveis de ambiente (.env.local).
// A 'anon key' (publishable) é segura para uso no frontend — expõe apenas
// o que o RLS do Supabase permitir. Nunca commite valores hardcoded aqui.

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env?.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[Trocô] ERRO: Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_KEY não encontradas. ' +
    'Certifique-se de que o arquivo .env.local está configurado corretamente.'
  );
}

export const supabase = createClient(supabaseUrl!, supabaseKey!);