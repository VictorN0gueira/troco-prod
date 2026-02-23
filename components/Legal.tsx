import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, FileText, Scale, Mail, MessageCircle, Instagram } from 'lucide-react';
import { LOGO_URL } from '../constants';

const Legal: React.FC = () => {
    const { section } = useParams<{ section: string }>();
    const navigate = useNavigate();

    useEffect(() => {
        if (section) {
            const element = document.getElementById(section);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [section]);

    const Section = ({ id, title, icon: Icon, children }: { id: string, title: string, icon: any, children: React.ReactNode }) => (
        <section id={id} className="mb-16 scroll-mt-24">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h2>
            </div>
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 leading-relaxed space-y-4">
                {children}
            </div>
        </section>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-4">
                <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-primary-500 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </button>
                    <img src={LOGO_URL} alt="Trocô" className="h-8 w-auto" />
                    <div className="w-20" /> {/* Spacer */}
                </div>
            </nav>

            <main className="pt-32 pb-24 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">Central Jurídica</h1>
                        <p className="text-slate-500 dark:text-slate-400">Transparência, segurança e respeito aos seus dados.</p>
                    </div>

                    {/* Quick Navigation */}
                    <div className="flex flex-wrap justify-center gap-3 mb-20">
                        {[
                            { id: 'privacidade', title: 'Privacidade', icon: Lock },
                            { id: 'seguranca', title: 'Segurança', icon: Shield },
                            { id: 'termos', title: 'Termos de Uso', icon: FileText },
                            { id: 'lgpd', title: 'LGPD', icon: Scale },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => navigate(`/legal/${item.id}`)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${section === item.id
                                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-primary-500'
                                    }`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.title}
                            </button>
                        ))}
                    </div>

                    <Section id="privacidade" title="Políticas de Privacidade" icon={Lock}>
                        <p>Na Trocô, a sua privacidade é nossa prioridade número um. Esta política descreve como coletamos, usamos e protegemos suas informações.</p>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">1. Coleta de Informações</h3>
                        <p>Coletamos apenas o essencial para o funcionamento do serviço: seu email de cadastro e os dados financeiros que você insere manualmente ou via integração WhatsApp.</p>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">2. Uso dos Dados</h3>
                        <p>Seus dados são utilizados exclusivamente para gerar os relatórios, dashboards e lembretes que você visualiza. Nós nunca venderemos ou compartilharemos seus dados financeiros com terceiros.</p>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">3. Armazenamento</h3>
                        <p>Utilizamos infraestrutura de nuvem de última geração (Supabase/AWS) com criptografia de ponta a ponta para garantir que apenas você tenha acesso às suas informações.</p>
                    </Section>

                    <Section id="seguranca" title="Segurança da Informação" icon={Shield}>
                        <p>Segurança não é uma funcionalidade, é o nosso alicerce. Implementamos múltiplas camadas de proteção para manter seu patrimônio invisível para ameaças externas.</p>
                        <ul className="list-disc pl-5 space-y-2 mt-4">
                            <li><strong>Criptografia SSL/TLS:</strong> Toda comunicação entre seu navegador e nossos servidores é criptografada.</li>
                            <li><strong>Sem Acesso Direto:</strong> Nós nunca solicitamos suas senhas bancárias. O controle é feito por lançamentos manuais ou importações controladas por você.</li>
                            <li><strong>Monitoramento 24/7:</strong> Sistemas automatizados vigiam nossa infraestrutura contra tentativas de acesso não autorizado.</li>
                            <li><strong>Backups Recorrentes:</strong> Seus dados são salvos em múltiplos locais seguros para garantir que nunca sejam perdidos.</li>
                        </ul>
                    </Section>

                    <Section id="termos" title="Termos de Uso" icon={FileText}>
                        <p>Ao utilizar a Trocô, você concorda com os seguintes termos de serviço:</p>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">1. Elegibilidade</h3>
                        <p>Você deve ter pelo menos 18 anos de idade e fornecer informações precisas durante o cadastro.</p>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">2. Assinaturas e Pagamentos</h3>
                        <p>O serviço é oferecido em modelos de assinatura mensal ou anual. O cancelamento pode ser feito a qualquer momento, interrompendo a renovação para o próximo período.</p>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">3. Responsabilidade do Usuário</h3>
                        <p>Você é responsável por manter a segurança de sua senha e por todas as atividades que ocorrem em sua conta.</p>
                    </Section>

                    <Section id="lgpd" title="Conformidade com a LGPD" icon={Scale}>
                        <p>Estamos em total conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">Seus Direitos:</h3>
                        <ul className="list-disc pl-5 space-y-2 mt-4">
                            <li><strong>Acesso:</strong> Você pode solicitar uma cópia de todos os seus dados armazenados.</li>
                            <li><strong>Correção:</strong> Direito de retificar dados incompletos ou inexatos.</li>
                            <li><strong>Exclusão:</strong> Você pode solicitar a remoção definitiva da sua conta e de todos os dados associados a qualquer momento.</li>
                            <li><strong>Portabilidade:</strong> Direito de receber seus dados em formato estruturado.</li>
                        </ul>
                        <div className="mt-8 p-6 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <p className="font-bold text-slate-900 dark:text-white mb-2">Controlador de Dados:</p>
                            <p className="text-sm">VN ONE TECNOLOGIA DA INFORMACAO LTDA</p>
                            <p className="text-sm">CNPJ: 62.924.262/0001-08</p>
                            <p className="text-sm">Encarregado (DPO): contato@vnone.com.br</p>
                        </div>
                    </Section>

                    {/* Footer for Legal */}
                    <div className="mt-20 pt-12 border-t border-slate-200 dark:border-slate-800 text-center">
                        <p className="text-sm text-slate-500 mb-6 font-semibold underline">Dúvidas sobre o conteúdo jurídico?</p>
                        <div className="flex justify-center gap-6">
                            <a href="mailto:contato@vnone.com.br" className="text-slate-400 hover:text-primary-500 transition-colors">
                                <Mail className="w-6 h-6" />
                            </a>
                            <a href="https://wa.me/5581987348633" className="text-slate-400 hover:text-primary-500 transition-colors">
                                <MessageCircle className="w-6 h-6" />
                            </a>
                            <a href="https://www.instagram.com/victornogueira._/" className="text-slate-400 hover:text-primary-500 transition-colors">
                                <Instagram className="w-6 h-6" />
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Legal;
