import React from 'react';
import { X, Shield, Lock, FileText, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LegalModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: 'privacidade' | 'seguranca' | 'termos' | 'lgpd';
    setActiveTab: (tab: 'privacidade' | 'seguranca' | 'termos' | 'lgpd') => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, activeTab, setActiveTab }) => {
    if (!isOpen) return null;

    const tabs = [
        { id: 'privacidade', title: 'Privacidade', icon: Lock },
        { id: 'seguranca', title: 'Segurança', icon: Shield },
        { id: 'termos', title: 'Termos de Uso', icon: FileText },
        { id: 'lgpd', title: 'LGPD', icon: Scale },
    ] as const;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, y: "100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh]"
                    >
                        {/* Header / Tabs */}
                        <div className="flex-shrink-0 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-10">
                            <div className="flex justify-between items-center p-4 sm:px-6">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 dark:text-white">Central Jurídica</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Transparência, segurança e respeito aos seus dados.</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Scrollable Tabs */}
                            <div className="px-4 sm:px-6 pb-4 overflow-x-auto custom-scrollbar flex gap-2">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all ${activeTab === tab.id
                                                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {tab.title}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400">
                                {activeTab === 'privacidade' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                                                <Lock className="w-4 h-4 text-primary-500" />
                                            </div>
                                            Políticas de Privacidade
                                        </h3>
                                        <p>Na Trocô, a sua privacidade é nossa prioridade número um. Esta política descreve como coletamos, usamos e protegemos suas informações.</p>

                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-6">1. Coleta de Informações</h4>
                                        <p>Coletamos apenas o essencial para o funcionamento do serviço: seu email de cadastro e os dados financeiros que você insere manualmente ou via integração WhatsApp.</p>

                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-6">2. Uso dos Dados</h4>
                                        <p>Seus dados são utilizados exclusivamente para gerar os relatórios, dashboards e lembretes que você visualiza. Nós nunca venderemos ou compartilharemos seus dados financeiros com terceiros.</p>

                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-6">3. Armazenamento</h4>
                                        <p>Utilizamos infraestrutura de nuvem de última geração (Supabase/AWS) com criptografia de ponta a ponta para garantir que apenas você tenha acesso às suas informações.</p>
                                    </motion.div>
                                )}

                                {activeTab === 'seguranca' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                                                <Shield className="w-4 h-4 text-primary-500" />
                                            </div>
                                            Segurança da Informação
                                        </h3>
                                        <p>Segurança não é uma funcionalidade, é o nosso alicerce. Implementamos múltiplas camadas de proteção para manter seu patrimônio invisível para ameaças externas.</p>
                                        <ul className="list-disc pl-5 space-y-2 mt-4">
                                            <li><strong>Criptografia SSL/TLS:</strong> Toda comunicação entre seu navegador e nossos servidores é criptografada.</li>
                                            <li><strong>Sem Acesso Direto:</strong> Nós nunca solicitamos suas senhas bancárias. O controle é feito por lançamentos manuais ou importações controladas por você.</li>
                                            <li><strong>Monitoramento 24/7:</strong> Sistemas automatizados vigiam nossa infraestrutura contra tentativas de acesso não autorizado.</li>
                                            <li><strong>Backups Recorrentes:</strong> Seus dados são salvos em múltiplos locais seguros para garantir que nunca sejam perdidos.</li>
                                        </ul>
                                    </motion.div>
                                )}

                                {activeTab === 'termos' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                                                <FileText className="w-4 h-4 text-primary-500" />
                                            </div>
                                            Termos de Uso
                                        </h3>
                                        <p>Ao utilizar a Trocô, você concorda com os seguintes termos de serviço:</p>

                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-6">1. Elegibilidade</h4>
                                        <p>Você deve ter pelo menos 18 anos de idade e fornecer informações precisas durante o cadastro.</p>

                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-6">2. Assinaturas e Pagamentos</h4>
                                        <p>O serviço é oferecido em modelos de assinatura mensal ou anual. O cancelamento pode ser feito a qualquer momento, interrompendo a renovação para o próximo período.</p>

                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-6">3. Responsabilidade do Usuário</h4>
                                        <p>Você é responsável por manter a segurança de sua senha e por todas as atividades que ocorrem em sua conta.</p>
                                    </motion.div>
                                )}

                                {activeTab === 'lgpd' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                                                <Scale className="w-4 h-4 text-primary-500" />
                                            </div>
                                            Conformidade com a LGPD
                                        </h3>
                                        <p>Estamos em total conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>

                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-6">Seus Direitos:</h4>
                                        <ul className="list-disc pl-5 space-y-2 mt-4">
                                            <li><strong>Acesso:</strong> Você pode solicitar uma cópia de todos os seus dados armazenados.</li>
                                            <li><strong>Correção:</strong> Direito de retificar dados incompletos ou inexatos.</li>
                                            <li><strong>Exclusão:</strong> Você pode solicitar a remoção definitiva da sua conta e de todos os dados associados a qualquer momento.</li>
                                            <li><strong>Portabilidade:</strong> Direito de receber seus dados em formato estruturado.</li>
                                        </ul>
                                        <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <p className="font-bold text-slate-900 dark:text-white mb-2">Controlador de Dados:</p>
                                            <p className="text-sm">VN ONE TECNOLOGIA DA INFORMACAO LTDA</p>
                                            <p className="text-sm">CNPJ: 62.924.262/0001-08</p>
                                            <p className="text-sm">Encarregado (DPO): contato@vnone.com.br</p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LegalModal;
