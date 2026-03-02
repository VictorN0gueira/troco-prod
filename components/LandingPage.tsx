import React, { useState, useEffect } from 'react';
import {
    ArrowRight,
    CheckCircle2,
    CreditCard,
    TrendingUp,
    Bell,
    MessageCircle,
    ShieldCheck,
    Star,
    Users,
    Menu,
    X,
    Zap,
    ChevronRight,
    Mail,
    Instagram,
    Newspaper,
    Clock,
    ExternalLink,
    Target
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { LOGO_URL } from '../constants';
import { InvestmentNews } from '../types';
import { fetchInvestmentNews } from '../services/priceApi';
import WhatsAppSimulation from './WhatsAppSimulation';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const [news, setNews] = useState<InvestmentNews[]>([]);
    const [newsLoading, setNewsLoading] = useState(true);

    useEffect(() => {
        const loadNews = async () => {
            try {
                const data = await fetchInvestmentNews();
                setNews(data.slice(0, 3)); // Only top 3 for landing page
            } catch (err) {
                console.error('Landing news error', err);
            } finally {
                setNewsLoading(false);
            }
        };
        loadNews();
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-primary-500/30">

            {/* --- Styles --- */}
            <style>{`
        @keyframes border-beam {
          100% { offset-distance: 100%; }
        }
        .border-beam {
          pointer-events: none;
          position: absolute;
          inset: 0;
          border: 2px solid transparent;
          border-radius: inherit;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
        }
        .border-beam::after {
          content: "";
          position: absolute;
          aspect-ratio: 1;
          width: 150px;
          background: linear-gradient(to right, #10B981, #3B82F6, transparent);
          offset-path: rect(0 auto auto 0 round 200px);
          animation: border-beam 4s linear infinite;
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .glass {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .dark .glass {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>

            {/* --- Navigation --- */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${isScrolled ? 'glass py-3 shadow-lg shadow-slate-200/20 dark:shadow-none' : 'bg-transparent py-5'
                }`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <img src={LOGO_URL} alt="Trocô" className="h-10 w-auto" />
                        <span className="text-xl font-black bg-gradient-to-r from-primary-600 to-emerald-500 bg-clip-text text-transparent hidden sm:block">
                            TROCÔ
                        </span>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <button onClick={() => scrollToSection('features')} className="text-sm font-semibold hover:text-primary-500 transition-colors">Funcionalidades</button>
                        <button onClick={() => scrollToSection('pricing')} className="text-sm font-semibold hover:text-primary-500 transition-colors">Preços</button>
                        <button onClick={() => scrollToSection('feedback')} className="text-sm font-semibold hover:text-primary-500 transition-colors">Feedback</button>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
                        >
                            Login
                        </button>
                    </div>

                    {/* Mobile Toggle */}
                    <button className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden glass absolute top-full left-0 right-0 p-6 flex flex-col gap-4 shadow-2xl animate-fade-in-down border-t border-slate-100 dark:border-slate-800">
                        <button onClick={() => scrollToSection('features')} className="text-left font-bold">Funcionalidades</button>
                        <button onClick={() => scrollToSection('pricing')} className="text-left font-bold">Preços</button>
                        <button onClick={() => scrollToSection('feedback')} className="text-left font-bold">Feedback</button>
                        <hr className="border-slate-100 dark:border-slate-800" />
                        <button onClick={() => navigate('/login')} className="py-4 rounded-2xl bg-primary-500 text-white font-bold">Login</button>
                    </div>
                )}
            </nav>

            {/* --- Retro Grid Pattern --- */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-40 dark:opacity-20">
                <div
                    className="absolute inset-0 animate-grid-move"
                    style={{
                        backgroundImage: `linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                        maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)',
                        WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)',
                    }}
                />
            </div>

            {/* --- Hero Section --- */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                {/* Decorative Blobs */}
                <div className="absolute top-20 -left-20 w-72 h-72 bg-primary-300 dark:bg-primary-900/30 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 animate-blob" />
                <div className="absolute top-40 -right-20 w-72 h-72 bg-emerald-300 dark:bg-emerald-900/30 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 animate-blob animation-delay-2000" />

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 text-primary-600 dark:text-primary-400 text-xs font-bold mb-8 animate-fade-in-up">
                        <Zap className="w-3 h-3 fill-current" />
                        <span>NOVO: Gestão de Investimentos Avançada</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-8 tracking-tight leading-[1.1] animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        Domine suas finanças <br />
                        <span className="bg-gradient-to-r from-primary-600 to-emerald-500 bg-clip-text text-transparent">
                            sem esforço algum.
                        </span>
                    </h1>

                    {/* Lottie Animation 1 - Growth */}
                    <div className="flex justify-center mb-8 animate-fade-in-up md:absolute md:top-20 md:right-10 md:mb-0 pointer-events-none opacity-50 dark:opacity-30 lg:opacity-100 lg:relative lg:top-0 lg:right-0 lg:opacity-100">
                        {/* @ts-ignore */}
                        <dotlottie-wc src="https://lottie.host/b973fc56-4f42-4bb1-be7f-853a3bfbf744/JqenXfBHCC.lottie" style={{ width: '200px', height: '200px' }} autoplay loop></dotlottie-wc>
                    </div>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-12 leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        A plataforma completa para gerir cartões, investimentos, contas e objetivos financeiros. Tudo em um só lugar, com a inteligência que você precisa.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                        <button
                            onClick={() => navigate('/login?mode=register')}
                            className="group relative w-full sm:w-auto px-10 py-5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black text-lg overflow-hidden transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {/* Shimmer Layer */}
                            <div className="absolute inset-0 w-full h-full animate-shimmer bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.1),transparent)] dark:bg-[linear-gradient(110deg,transparent,rgba(0,0,0,0.05),transparent)]" />
                            <span className="relative">Crie sua conta grátis</span>
                            <ArrowRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={() => scrollToSection('features')}
                            className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-lg hover:bg-white dark:hover:bg-slate-800 transition-all"
                        >
                            Ver Funcionalidades
                        </button>
                    </div>

                    <div className="mt-20 relative animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                        <div className="glass p-2 md:p-4 rounded-[2.5rem] shadow-3xl shadow-slate-200/50 dark:shadow-none max-w-5xl mx-auto">
                            <div className="bg-slate-900 dark:bg-slate-950 rounded-[2rem] overflow-hidden aspect-[16/10] md:aspect-video relative">
                                {/* Mockup do Dashboard Real - Browser Frame Style */}
                                <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col group/mockup">
                                    {/* Fake Browser Bar */}
                                    <div className="h-6 md:h-8 bg-slate-200/50 dark:bg-slate-800/50 flex items-center px-4 gap-1.5 border-b border-slate-300/30 dark:border-slate-700/30">
                                        <div className="w-2 h-2 rounded-full bg-rose-400" />
                                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                    </div>
                                    <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-slate-50 dark:bg-slate-900 ring-1 ring-inset ring-slate-200/50 dark:ring-slate-700/50">
                                        <img
                                            src="https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FTroc%C3%B4%2Fdashboard_preview.png&version_id=null"
                                            alt="Dashboard Trocô"
                                            className="w-full h-full object-contain p-1 md:p-2 transition-transform duration-700 hover:scale-[1.01]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Features Section --- */}
            <section id="features" className="py-24 bg-white dark:bg-slate-950">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-xs font-black text-primary-500 uppercase tracking-widest mb-4">Poderoso e Intuitivo</h2>
                        <h3 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white">Tudo que você precisa para <br className="hidden md:block" /> sua vida financeira.</h3>
                    </div>

                    <div className="flex flex-wrap justify-center gap-8">
                        {[
                            { icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', title: 'Gestão de Cartões', desc: 'Acompanhe faturamentos, limites e melhores datas de compra automaticamente.' },
                            { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', title: 'Investimentos', desc: 'Sua carteira consolidada com cotações em tempo real e análise de performance.' },
                            { icon: Bell, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', title: 'Contas e Lembretes', desc: 'Nunca mais esqueça de pagar um boleto. Notificações inteligentes de vencimento.' },
                            { icon: MessageCircle, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10', title: 'Agente WhatsApp', desc: 'Interaja com seu assistente financeiro direto pelo WhatsApp via comandos de voz ou texto.' },
                            { icon: Target, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', title: 'Metas Financeiras', desc: 'Defina, acompanhe e alcance seus objetivos financeiros mais rápido com metas inteligentes.' }
                        ].map((f, i) => (
                            <div key={i} className="flex-1 min-w-[280px] max-w-[320px] group p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary-500/50 hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-500">
                                <div className={`w-14 h-14 ${f.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <f.icon className={`w-7 h-7 ${f.color}`} />
                                </div>
                                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{f.title}</h4>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- WhatsApp Bot Showcase Section --- */}
            <section className="py-24 relative overflow-hidden bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-300 dark:bg-emerald-900/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-[100px] opacity-40 animate-blob" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-300 dark:bg-primary-900/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-[100px] opacity-40 animate-blob animation-delay-4000" />

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        {/* Text Content */}
                        <div className="flex-1 lg:pr-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-8">
                                <MessageCircle className="w-4 h-4" />
                                <span>Funcionalidade Exclusiva</span>
                            </div>

                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
                                Gestão na palma <br />
                                da sua mão, <span className="text-emerald-500">literalmente.</span>
                            </h2>

                            <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                                Esqueça planilhas complicadas e apps que você desiste de usar. Com a Trocô, você pode registrar gastos, consultar saldos e criar lembretes conversando com nossa IA pelo WhatsApp.
                            </p>

                            <ul className="space-y-4 mb-10">
                                {[
                                    'Reconhecimento de áudio',
                                    'Categorização automática de despesas',
                                    'Dúvidas financeiras em tempo real'
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => window.open('https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d', '_blank')}
                                className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
                            >
                                Testar Agente Agora
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Phone Mockup / Simulation */}
                        <div className="flex-1 w-full lg:w-auto flex justify-center lg:justify-end">
                            {/* Glow behind phone */}
                            <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl rounded-full" />
                            <div className="relative z-10 w-full max-w-[380px]">
                                <WhatsAppSimulation />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Market Radar Section --- */}
            <section id="news" className="py-24 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-12">
                        <div className="max-w-2xl">
                            <h2 className="text-xs font-black text-primary-500 uppercase tracking-widest mb-4">Radar de Mercado</h2>
                            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                                <h3 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight">
                                    Fique por dentro do que <br className="hidden md:block" /> move o seu dinheiro.
                                </h3>
                                {/* Lottie Animation - Market Radar */}
                                <div className="flex-shrink-0 animate-float">
                                    {/* @ts-ignore */}
                                    <dotlottie-wc
                                        src="https://lottie.host/f445e385-9730-4773-8606-17da8789b62f/YI1LeYLZ3s.lottie"
                                        style={{ width: '220px', height: '220px' }}
                                        autoplay
                                        loop
                                    />
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium mt-6">Notícias selecionadas e atualizadas em tempo real para sua tomada de decisão.</p>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="group flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold hover:gap-3 transition-all pb-4"
                        >
                            Ver todos os insights
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {newsLoading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="glass h-64 rounded-[2rem] animate-pulse" />
                            ))
                        ) : news.map((item, idx) => (
                            <div key={idx} className="group glass p-8 rounded-[2rem] hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-500 flex flex-col border border-slate-100 dark:border-slate-800">
                                <div className="flex items-start justify-between mb-6">
                                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                        {item.source}
                                    </span>
                                    <Clock className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 line-clamp-2 leading-tight group-hover:text-primary-500 transition-colors">
                                    {item.title}
                                </h4>
                                <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 mb-8 flex-grow">
                                    {item.description}
                                </p>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-primary-500 hover:gap-3 transition-all"
                                >
                                    Ler na íntegra
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- Pricing Section --- */}
            <section id="pricing" className="py-24 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6">Investimento que se paga.</h2>
                        <p className="text-slate-500 dark:text-slate-400">Escolha o plano que melhor se adapta ao seu momento.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Plano Mensal */}
                        <div className="glass p-10 rounded-[2.5rem] bg-white dark:bg-slate-900/50 flex flex-col border border-slate-100 dark:border-slate-800 transition-all hover:scale-[1.02]">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Plano Mensal</h4>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-black text-slate-900 dark:text-white">R$ 29,90</span>
                                <span className="text-slate-500 dark:text-slate-400 text-sm">/mês</span>
                            </div>
                            <ul className="space-y-4 mb-10 flex-1 text-slate-600 dark:text-slate-300">
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    Todas as Funcionalidades Pro
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    Agente WhatsApp IA
                                </li>
                                <li className="flex items-center gap-3 opacity-50">
                                    <CheckCircle2 className="w-5 h-5 text-slate-300" />
                                    Economia de 35% no Anual
                                </li>
                            </ul>
                            <button
                                onClick={() => window.open('https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d', '_blank')}
                                className="w-full py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:scale-105 transition-all"
                            >
                                Assinar Agora
                            </button>
                        </div>

                        {/* Plano Anual - Destaque */}
                        <div className="relative p-10 rounded-[2.5rem] bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex flex-col shadow-2xl shadow-primary-500/20 scale-105 z-10 overflow-hidden">
                            {/* Border Beam Effect */}
                            <div className="border-beam" />

                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full z-20">
                                Melhor Custo-Benefício
                            </div>
                            <h4 className="text-lg font-bold mb-2 relative z-20">Plano Anual</h4>
                            <div className="flex items-baseline gap-1 mb-1 relative z-20">
                                <span className="text-4xl font-black">R$ 19,90</span>
                                <span className="opacity-60 text-sm">/mês*</span>
                            </div>
                            <p className="text-[10px] opacity-50 mb-6 relative z-20">*Cobrado anualmente (R$ 238,80)</p>

                            <ul className="space-y-4 mb-10 flex-1 relative z-20">
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary-500" />
                                    Acesso Total Ilimitado
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary-500" />
                                    Suporte Prioritário
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary-500" />
                                    Economia de 35% ao ano
                                </li>
                            </ul>
                            <button
                                onClick={() => window.open('https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d', '_blank')}
                                className="w-full py-4 rounded-xl bg-primary-500 text-white font-bold hover:scale-105 transition-all relative z-20"
                            >
                                Aproveitar Desconto
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Feedback Section --- */}
            <section id="feedback" className="py-24 bg-slate-100 dark:bg-slate-900/30">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
                        <div className="max-w-xl">
                            <h2 className="text-xs font-black text-primary-500 uppercase tracking-widest mb-4">Depoimentos</h2>
                            <h3 className="text-4xl font-black text-slate-900 dark:text-white">O que nossos usuários dizem sobre o Trocô.</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="ml-2">
                                <div className="flex text-amber-500 items-center">
                                    <Star className="w-3 h-3 fill-current" />
                                    <Star className="w-3 h-3 fill-current" />
                                    <Star className="w-3 h-3 fill-current" />
                                    <Star className="w-3 h-3 fill-current" />
                                    <Star className="w-3 h-3 fill-current" />
                                </div>
                                <span className="text-xs font-bold text-slate-500">+100 usuários</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { name: 'Maria Izabelly', role: 'Enfermeira', text: 'Trabalho em muitos plantões e não tenho tempo para planilhas chatas. Economizo um tempo absurdo que antes perdia registrando tudo manualmente.' },
                            { name: 'Daniel Francisco', role: 'Designer', text: 'O bot do WhatsApp é genial. Consigo registrar tudo na hora que gasto, sem precisar abrir app nem nada. Facilitou demais minha rotina.' },
                            { name: 'Adrian Gabriel', role: 'Desenvolvedor', text: 'O app é direto ao ponto e muito bonito. O controle dos cartões finalmente me deu paz de espírito pra não perder nenhum vencimento.' }
                        ].map((f, i) => (
                            <div key={i} className="glass p-8 rounded-3xl relative">
                                <div className="flex text-amber-500 mb-6">
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-current" />)}
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 mb-8 italic">"{f.text}"</p>
                                <div className="flex items-center gap-4">
                                    <div>
                                        <h5 className="font-bold text-slate-900 dark:text-white text-sm">{f.name}</h5>
                                        <p className="text-xs text-slate-500">{f.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- Footer & CTA Section --- */}
            <section className="py-24 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 relative">
                    {/* Lottie Animation 2 - Wallet/Security indicator */}
                    <div className="flex justify-center mb-[-40px] relative z-20 pointer-events-none">
                        {/* @ts-ignore */}
                        <dotlottie-wc
                            src="https://lottie.host/092a67b8-63ea-4255-bb22-1f14c5224e2f/4WEq5S6uVQ.lottie"
                            style={{ width: '180px', height: '180px' }}
                            autoplay
                            loop
                        />
                    </div>
                    <div className="bg-gradient-to-br from-primary-600 to-emerald-600 rounded-[3rem] p-8 md:p-20 text-center text-white relative overflow-hidden shadow-3xl shadow-primary-500/30">
                        {/* Background elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                        <div className="relative z-10 max-w-3xl mx-auto">
                            <h2 className="text-4xl md:text-6xl font-black mb-8">Comece a transformar sua vida financeira hoje.</h2>
                            <p className="text-lg md:text-xl text-white/80 mb-12">Tenha o controle total do seu patrimônio com a melhor ferramenta de gestão financeira do Brasil.</p>
                            <button
                                onClick={() => navigate('/login?mode=register')}
                                className="px-10 py-5 rounded-2xl bg-white text-primary-600 font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20"
                            >
                                Crie sua conta grátis
                            </button>
                        </div>
                    </div>

                    <div className="mt-24 grid grid-cols-1 md:grid-cols-4 gap-12 border-t border-slate-200 dark:border-slate-800 pt-16">
                        <div className="md:col-span-2">
                            <img src={LOGO_URL} alt="Trocô" className="h-12 w-auto mb-6" />
                            <p className="max-w-sm text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">
                                VN ONE TECNOLOGIA DA INFORMACAO LTDA <br />
                                CNPJ 62.924.262/0001-08 <br />
                                contato@vnone.com.br
                            </p>
                            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                                <a href="https://wa.me/5581987348633" target="_blank" rel="noopener noreferrer" className="hover:text-primary-500 transition-colors flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4" />
                                    <span className="text-xs font-semibold">(81) 98734-8633</span>
                                </a>
                            </div>
                        </div>
                        <div>
                            <h5 className="font-bold mb-6">Produto</h5>
                            <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
                                <li><button onClick={() => scrollToSection('features')} className="hover:text-primary-500 transition-colors">Funcionalidades</button></li>
                                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-primary-500 transition-colors">Preços</button></li>
                                <li><button onClick={() => navigate('/legal/seguranca')} className="hover:text-primary-500 transition-colors">Segurança</button></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-bold mb-6">Suporte</h5>
                            <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
                                <li><button onClick={() => navigate('/legal/termos')} className="hover:text-primary-500 transition-colors">Termos de Uso</button></li>
                                <li><button onClick={() => navigate('/legal/privacidade')} className="hover:text-primary-500 transition-colors">Privacidade</button></li>
                                <li><button onClick={() => navigate('/legal/lgpd')} className="hover:text-primary-500 transition-colors">LGPD</button></li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-16 pb-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
                        <p>© {new Date().getFullYear()} Trocô Gestão Financeira. Todos os direitos reservados.</p>
                        <div className="flex gap-6 items-center">
                            <a href="https://www.instagram.com/victornogueira._/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary-500 transition-colors">
                                <Instagram className="w-5 h-5" />
                            </a>
                            <a href="https://wa.me/5581987348633" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary-500 transition-colors">
                                <MessageCircle className="w-5 h-5" />
                            </a>
                            <a href="mailto:contato@vnone.com.br" className="text-slate-400 hover:text-primary-500 transition-colors">
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default LandingPage;
