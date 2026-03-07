import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CheckCircle2, ChevronRight, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

interface TermsModalProps {
    user: UserProfile;
    onAccept: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ user, onAccept }) => {
    const [isAccepting, setIsAccepting] = useState(false);
    const [hasScrolled, setHasScrolled] = useState(false);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50) {
            setHasScrolled(true);
        }
    };

    const handleAccept = async () => {
        setIsAccepting(true);
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({ contrato_assinado: true })
                .eq('id', user.id);

            if (error) throw error;

            onAccept();
        } catch (err) {
            console.error('Erro ao aceitar os termos:', err);
        } finally {
            setIsAccepting(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
            >
                {/* Backdrop glassmorphism effect */}
                <div
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                    className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col"
                >
                    {/* Header */}
                    <div className="p-6 md:p-8 shrink-0 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Termos de Uso e Privacidade
                                </h2>
                                <p className="text-sm text-slate-500 mt-1 font-medium">
                                    Para continuar usando o Trocô, você precisa ler e aceitar nossos termos atualizados de acordo com a LGPD.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Terms Content - Scrollable */}
                    <div
                        className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-grow bg-white dark:bg-slate-900 space-y-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed"
                        onScroll={handleScroll}
                    >
                        <section>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">1. Aceitação dos Termos</h3>
                            <p>
                                Ao acessar e utilizar o aplicativo Trocô, você concorda em cumprir estes termos de serviço e todas as leis e regulamentos aplicáveis. Se você não concordar com algum destes termos, está proibido de usar ou acessar este site/aplicativo.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">2. Privacidade e LGPD</h3>
                            <p className="mb-2">
                                Nós levamos sua privacidade a sério. Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), informamos que:
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Coletamos apenas os dados pessoais estritamente necessários para o funcionamento e melhoria da plataforma (como nome, e-mail e dados de movimentações financeiras inseridas voluntariamente por você).</li>
                                <li>Seus dados são armazenados de forma segura e criptografada (SSL/TLS e banco de dados restrito).</li>
                                <li>Não vendemos, alugamos ou compartilhamos seus dados financeiros com terceiros para fins de marketing não autorizado.</li>
                                <li>Você tem o direito de solicitar a exclusão total da sua conta e de todos os seus dados a qualquer momento nas configurações do aplicativo.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">3. Uso da Conta</h3>
                            <p>
                                Você é responsável por manter a confidencialidade da sua senha e conta, sendo integralmente responsável por todas as atividades que ocorram sob sua senha ou conta.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">4. Comunicações</h3>
                            <p>
                                Ao aceitar estes termos, você concorda em receber comunicações relacionadas à sua conta e ao sistema (resets de senha, alertas de segurança). Comunicações de marketing exigem seu consentimento explícito e separado nas Configurações.
                            </p>
                        </section>
                    </div>

                    {/* Footer - Fixed */}
                    <div className="p-6 md:p-8 shrink-0 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                                <FileText className="w-4 h-4" />
                                <span>Atualizado em Março de 2026</span>
                            </div>

                            <button
                                onClick={handleAccept}
                                disabled={isAccepting}
                                className={`
                  relative overflow-hidden group w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-8 rounded-2xl font-bold text-white transition-all
                  ${isAccepting ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[.98] shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40'}
                `}
                            >
                                {/* Efeito de brilho que passa pelo botão */}
                                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />

                                {isAccepting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        Li e aceito os Termos
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Aviso visual de rolagem (opcional se não quiser obrigar até o final) */}
                        {!hasScrolled && (
                            <p className="text-xs text-center sm:text-right mt-3 text-slate-400 font-medium">
                                Sugerimos rolar para ler todos os termos.
                            </p>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TermsModal;
