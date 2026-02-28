import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jxwlttibcigihiyllhmz.supabase.co';
const supabaseKey = 'sb_publishable_J6n8BuizmLDjbwUrxo2T-Q_qGh8B3qV';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const { data, error } = await supabase.from('metas').insert({
        user_id: 1, // um ID válido de usuário de teste
        name: 'Teste de Script',
        target_amount: 5000,
        current_amount: 0,
        deadline: '2026-12-31',
        color: '#10B981',
        icon: 'Target'
    }).select();

    if (error) {
        console.error('Erro detalhado:', JSON.stringify(error, null, 2));
    } else {
        console.log('Sucesso:', data);
    }
}

testInsert();
