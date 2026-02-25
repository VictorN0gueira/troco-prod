import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Newspaper, TrendingUp, TrendingDown, Clock, Search, Filter, RefreshCw, AlertTriangle } from 'lucide-react';
import SuperPaywall from './SuperPaywall';
import { InvestmentNews, UserProfile } from '../types';
import { fetchInvestmentNews } from '../services/priceApi';
import { supabase } from '../supabaseClient';

const NewsCard = ({ news }: { news: InvestmentNews }) => {
    const formattedDate = news.timestamp ? new Date(news.timestamp).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }) : '';

    return (
        <div className="group bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 flex flex-col h-full active:scale-[0.98]">
            {news.image && (
                <div className="relative h-48 overflow-hidden">
                    <img
                        src={news.image}
                        alt={news.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            )}

            <div className="p-5 flex flex-col flex-grow">
                <div className="flex items-start justify-between gap-4 mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                        {news.source || 'Investimentos'}
                    </span>
                    {formattedDate && (
                        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs">
                            <Clock className="w-3 h-3" />
                            {formattedDate}
                        </div>
                    )}
                </div>

                <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2 line-clamp-2 leading-tight group-hover:text-emerald-500 transition-colors">
                    {news.title}
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-3 leading-relaxed flex-grow">
                    {news.description}
                </p>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    <a
                        href={news.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                    >
                        Ler notícia completa
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>
        </div>
    );
};

const NewsFeed = ({ user }: { user: UserProfile }) => {
    const isSuper = user?.status_assinatura === 'active';

    if (!isSuper) {
        return <SuperPaywall feature="Insights de Mercado" userEmail={user?.email} />;
    }

    const [news, setNews] = useState<InvestmentNews[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('');

    const loadNews = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // BACKEND SECURITY CHECK: Prevent React State Spoofing for Premium Features
            const { data: dbUser } = await supabase.from('usuarios').select('tem_plano').eq('id', user.id).single();
            if (!dbUser?.tem_plano) {
                setError('Assinatura inválida no servidor. Atualize a página.');
                setNews([]);
                setLoading(false);
                return;
            }

            const data = await fetchInvestmentNews();
            if (data.length === 0) {
                setError('Nenhuma notícia encontrada no momento.');
            } else {
                setNews(data);
            }
        } catch (err) {
            setError('Erro ao carregar notícias. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNews();

        // Atualiza as notícias a cada 3 minutos
        const intervalId = setInterval(() => {
            loadNews();
        }, 3 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [loadNews]);

    const filteredNews = news.filter(item =>
        item.title.toLowerCase().includes(filter.toLowerCase()) ||
        item.description.toLowerCase().includes(filter.toLowerCase()) ||
        item.source.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2 flex items-center gap-3">
                        <Newspaper className="w-8 h-8 text-emerald-500" />
                        Insights do Mercado
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        As principais atualizações do mundo financeiro em tempo real.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar notícias..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="pl-10 pr-4 py-2.5 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={loadNews}
                        disabled={loading}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl h-[400px] animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{error}</h3>
                    <button
                        onClick={loadNews}
                        className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                    >
                        Tentar novamente
                    </button>
                </div>
            ) : filteredNews.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-slate-500 dark:text-slate-400">Nenhuma notícia encontrada para seus critérios de busca.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNews.map((item, idx) => (
                        <NewsCard key={idx} news={item} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default NewsFeed;
