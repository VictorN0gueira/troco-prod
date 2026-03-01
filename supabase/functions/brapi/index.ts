import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

// Supondo que a variável de ambiente secreta foi configurada no Supabase como BRAPI_TOKEN
// via comando: supabase secrets set BRAPI_TOKEN="seu_token_aqui"

serve(async (req) => {
    // Trata requests do tipo OPTIONS para o CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { url } = req
        // Pega a URL do request. Espera-se que venha o ticker, ex: /brapi?tickers=BBSD11,PETR4
        const urlObj = new URL(url)
        const tickers = urlObj.searchParams.get('tickers')
        const currency = urlObj.searchParams.get('currency') || 'BRL'

        if (!tickers) {
            return new Response(JSON.stringify({ error: 'Tickers parameter is required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const token = Deno.env.get('BRAPI_TOKEN')
        if (!token) {
            console.warn("BRAPI_TOKEN não está configurado nas secrets do Supabase")
        }

        // Faz o request para a Brapi original passando o token por baixo dos panos
        const brapiUrl = `https://brapi.dev/api/quote/${tickers}?currency=${currency}${token ? `&token=${token}` : ''}`

        const response = await fetch(brapiUrl)
        const data = await response.json()

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: response.status,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
