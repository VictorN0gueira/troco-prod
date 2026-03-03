import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jxwlttibcigihiyllhmz.supabase.co';
const supabaseKey = 'sb_publishable_J6n8BuizmLDjbwUrxo2T-Q_qGh8B3qV';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    // Pegar o id de um usuario primeiro
    const { data: userData, error: userError } = await supabase.from('usuarios').select('id').limit(1);
    if (!userData || userData.length === 0) {
        console.error('Nenhum usuario encontrado', userError);
        return;
    }
    const userId = userData[0].id;

    const dummyItem = {
        user_id: userId,
        url: 'https://example.com/test-news',
        title: 'Teste de Noticia',
        description: 'Desc',
        image: 'https://example.com/img.jpg',
        source: 'Exemplo',
        source_color: '#000000',
        category: 'Geral',
        sentiment: 'neutral',
        timestamp: '2023-10-10'
    };

    const { data, error } = await supabase.from('saved_news').upsert(dummyItem).select();

    if (error) {
        console.error('Erro detalhado:', JSON.stringify(error, null, 2));
    } else {
        console.log('Sucesso:', data);
    }
}

testInsert();
