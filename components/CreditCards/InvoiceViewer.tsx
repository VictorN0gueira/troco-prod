import React from 'react';
import { CreditCard, Transaction } from '../../types';
import { X, Calendar, CalendarClock, TrendingUp, History, Check } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { getInvoiceReferenceDate } from '../../utils';

interface InvoiceViewerProps {
    viewingInvoice: CreditCard;
    transactions: Transaction[];
    currentInvoiceDate: Date;
    invoiceTab: 'transactions' | 'history' | 'subscriptions';
    setInvoiceTab: React.Dispatch<React.SetStateAction<'transactions' | 'history' | 'subscriptions'>>;
    onClose: () => void;
    prevInvoice: () => void;
    nextInvoice: () => void;
    handlePayInvoiceClick: (id: number, amount: number, transactionIds: string[]) => void;
}

const InvoiceViewer: React.FC<InvoiceViewerProps> = ({
    viewingInvoice,
    transactions,
    currentInvoiceDate,
    invoiceTab,
    setInvoiceTab,
    onClose,
    prevInvoice,
    nextInvoice,
    handlePayInvoiceClick
}) => {
    // Visual Helper for Gradient
    const getGradient = (hexColor: string) => {
        return `linear-gradient(135deg, ${hexColor} 0%, ${adjustColor(hexColor, -40)} 100%)`;
    };

    function adjustColor(color: string, amount: number) {
        return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
    }

    const getTransactionInvoiceDate = (date: string, closingDay: number) => {
        return getInvoiceReferenceDate(date, closingDay);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                <div
                    className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm transition-opacity"
                    aria-hidden="true"
                    onClick={onClose}
                />
                <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
                <div className="relative inline-block transform overflow-hidden rounded-3xl bg-white dark:bg-slate-850 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-slate-100 dark:border-slate-800 align-middle w-full animate-fade-in-up">

                    {/* Header */}
                    <div className="relative p-6 text-white overflow-hidden" style={{ background: getGradient(viewingInvoice.color) }}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors z-20"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-2xl font-bold tracking-tight">{viewingInvoice.name}</h3>
                            </div>

                            {/* Date Navigation */}
                            <div className="flex items-center gap-4 mt-4 bg-black/20 backdrop-blur-sm rounded-xl p-2 w-fit">
                                <button onClick={prevInvoice} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                                    <div className="w-6 h-6 flex items-center justify-center">←</div>
                                </button>
                                <div className="text-center min-w-[120px]">
                                    <span className="text-xs uppercase tracking-wider opacity-80 block">Competência</span>
                                    <span className="font-bold">
                                        {currentInvoiceDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                                <button onClick={nextInvoice} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                                    <div className="w-6 h-6 flex items-center justify-center">→</div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Metrics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Fatura de {currentInvoiceDate.toLocaleDateString('pt-BR', { month: 'long' })}</p>
                                {(() => {
                                    const invoiceTxs = transactions.filter(t => {
                                        if (t.cardId !== viewingInvoice.id || t.type !== 'expense') return false;
                                        const tInvoiceDate = getTransactionInvoiceDate(t.date, viewingInvoice.closing_day);
                                        return tInvoiceDate.getTime() === currentInvoiceDate.getTime();
                                    });
                                    const invoiceTotal = invoiceTxs.reduce((sum, t) => sum + t.amount, 0);

                                    // Global limit usage — MAX of DB-stored or computed from transactions
                                    const allPending = transactions.filter(t => t.cardId === viewingInvoice.id && t.status === 'pending' && t.type === 'expense');
                                    const computedUsage = allPending.reduce((sum, t) => sum + t.amount, 0);
                                    const totalUsedLimit = Math.max(viewingInvoice.current_usage || 0, computedUsage);
                                    const usagePercentage = Math.min(100, (totalUsedLimit / viewingInvoice.limit_amount) * 100);
                                    const barClr = usagePercentage >= 100 ? '#EF4444' : usagePercentage >= 75 ? '#F59E0B' : '#10B981';

                                    return (
                                        <>
                                            <p className="text-2xl font-bold text-slate-800 dark:text-white">
                                                R$ {totalUsedLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                            {invoiceTotal > 0 && invoiceTotal !== totalUsedLimit && (
                                                <p className="text-xs text-slate-400 mt-0.5">Fatura do mês: R$ {invoiceTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            )}
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-3 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{ width: `${usagePercentage}%`, background: barClr }}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">
                                                {Math.round(usagePercentage)}% do limite total utilizado
                                            </p>
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Limite Disponível Global</p>
                                {(() => {
                                    const allPending = transactions.filter(t => t.cardId === viewingInvoice.id && t.status === 'pending' && t.type === 'expense');
                                    const computedUsage = allPending.reduce((sum, t) => sum + t.amount, 0);
                                    const totalUsedLimit = Math.max(viewingInvoice.current_usage || 0, computedUsage);
                                    const available = viewingInvoice.limit_amount - totalUsedLimit;
                                    const isOver = available < 0;

                                    return (
                                        <p className={`text-2xl font-bold ${isOver ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {isOver ? '-' : ''}R$ {Math.abs(available).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    )
                                })()}

                                <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                                    <Calendar className="w-3 h-3" />
                                    <span>Fecha dia {viewingInvoice.closing_day}</span>
                                    <span className="mx-1">•</span>
                                    <CalendarClock className="w-3 h-3" />
                                    <span>Vence dia {viewingInvoice.due_day}</span>
                                </div>
                            </div>
                        </div>

                        {/* Charts & Analysis */}
                        {(() => {
                            const invoiceTxs = transactions.filter(t => {
                                if (t.cardId !== viewingInvoice.id || t.type !== 'expense') return false;
                                const tInvoiceDate = getTransactionInvoiceDate(t.date, viewingInvoice.closing_day);
                                return tInvoiceDate.getTime() === currentInvoiceDate.getTime();
                            });

                            // Bar Chart Data (1 month before, current, 4 months ahead)
                            const barData = Array.from({ length: 6 }).map((_, i) => {
                                const d = new Date(currentInvoiceDate);
                                d.setMonth(d.getMonth() + (i - 1));

                                const mtxs = transactions.filter(t => {
                                    if (t.cardId !== viewingInvoice.id || t.type !== 'expense') return false;
                                    const tInvDate = getTransactionInvoiceDate(t.date, viewingInvoice.closing_day);
                                    return tInvDate.getTime() === d.getTime();
                                });

                                const isCurrent = i === 1;

                                return {
                                    name: d.toLocaleDateString('pt-BR', { month: 'short' }),
                                    fullName: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
                                    amount: mtxs.reduce((sum, t) => sum + t.amount, 0),
                                    isCurrent,
                                    fillColor: isCurrent ? viewingInvoice.color : '#94A3B8' // Destaque na fatura atual
                                };
                            });

                            // Pie Chart Data
                            const categoryTotals = invoiceTxs.reduce((acc, t) => {
                                acc[t.category] = (acc[t.category] || 0) + t.amount;
                                return acc;
                            }, {} as Record<string, number>);

                            const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#6366F1'];
                            const pieData = Object.entries(categoryTotals)
                                .map(([name, value]) => ({ name, value }))
                                .sort((a, b) => b.value - a.value);

                            return invoiceTxs.length > 0 || barData.some(d => d.amount > 0) ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                    {/* Evolution Bar Chart */}
                                    <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Evolução & Projeção (6m)</h4>
                                        <div className="h-40">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                                                    <Tooltip
                                                        cursor={{ fill: 'rgba(51, 65, 85, 0.1)' }}
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                        formatter={(val: number) => [`R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Fatura']}
                                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                                                    />
                                                    <Bar dataKey="amount" fill="#94A3B8" radius={[4, 4, 0, 0]}>
                                                        {barData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fillColor} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Category Pie Chart */}
                                    <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Por Categoria</h4>
                                        <div className="h-40 flex items-center justify-between">
                                            <div className="w-1/2 h-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={pieData}
                                                            innerRadius={30}
                                                            outerRadius={45}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {pieData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="w-1/2 overflow-y-auto max-h-40 custom-scrollbar pr-1">
                                                {pieData.map((entry, index) => (
                                                    <div key={entry.name} className="flex items-center justify-between text-xs mb-2 last:mb-0">
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                            <span className="text-slate-600 dark:text-slate-300 truncate" title={entry.name}>{entry.name}</span>
                                                        </div>
                                                        <span className="font-medium text-slate-800 dark:text-white ml-2">
                                                            {Math.round((entry.value / categoryTotals[entry.name]) * 100) || Math.round((entry.value / pieData.reduce((s, d) => s + d.value, 0)) * 100)}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null;
                        })()}

                        {/* Transaction List or History Tabs */}
                        <div>
                            <div className="flex gap-4 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto custom-scrollbar whitespace-nowrap">
                                <button
                                    onClick={() => setInvoiceTab('transactions')}
                                    className={`font-bold pb-2 border-b-2 transition-colors flex items-center gap-2 ${invoiceTab === 'transactions' ? 'text-primary-500 border-primary-500' : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    Fatura Atual
                                </button>
                                <button
                                    onClick={() => setInvoiceTab('subscriptions')}
                                    className={`font-bold pb-2 border-b-2 transition-colors flex items-center gap-2 ${invoiceTab === 'subscriptions' as any ? 'text-purple-500 border-purple-500' : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}
                                >
                                    <CalendarClock className="w-4 h-4" />
                                    Assinaturas
                                </button>
                                <button
                                    onClick={() => setInvoiceTab('history')}
                                    className={`font-bold pb-2 border-b-2 transition-colors flex items-center gap-2 ${invoiceTab === 'history' ? 'text-primary-500 border-primary-500' : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}
                                >
                                    <History className="w-4 h-4" />
                                    Histórico de Pagamentos
                                </button>
                            </div>

                            {invoiceTab === 'transactions' ? (
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            Transações nesta Fatura
                                        </h4>

                                        {(() => {
                                            const invoiceTxs = transactions.filter(t => {
                                                if (t.cardId !== viewingInvoice.id || t.type !== 'expense') return false;
                                                const tInvoiceDate = getTransactionInvoiceDate(t.date, viewingInvoice.closing_day);
                                                return tInvoiceDate.getTime() === currentInvoiceDate.getTime();
                                            });
                                            // Permite pagar as que estão pendentes e pertencem a essa fatura
                                            const pendingInInvoice = invoiceTxs.filter(t => t.status === 'pending');
                                            const pendingAmount = pendingInInvoice.reduce((s, t) => s + t.amount, 0);

                                            if (pendingInInvoice.length > 0) {
                                                return (
                                                    <button
                                                        onClick={() => {
                                                            handlePayInvoiceClick(viewingInvoice.id, pendingAmount, pendingInInvoice.map(t => t.id));
                                                        }}
                                                        className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-1"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                        Pagar Fatura
                                                    </button>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>

                                    <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                        {(() => {
                                            const invoiceTxs = transactions.filter(t => {
                                                if (t.cardId !== viewingInvoice.id || t.type !== 'expense') return false;
                                                const tInvoiceDate = getTransactionInvoiceDate(t.date, viewingInvoice.closing_day);
                                                return tInvoiceDate.getTime() === currentInvoiceDate.getTime();
                                            })
                                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                            return (
                                                <>
                                                    {invoiceTxs.map((transaction) => (
                                                        <div key={transaction.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                                                                    <TrendingUp className="w-5 h-5 transform rotate-180" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-slate-800 dark:text-white">{transaction.description}</p>
                                                                    <p className="text-xs text-slate-400">
                                                                        {new Date(transaction.date + 'T12:00:00').toLocaleDateString('pt-BR')} • {transaction.category}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <span className="font-bold text-red-500">
                                                                - R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {invoiceTxs.length === 0 && (
                                                        <div className="text-center py-8 text-slate-400">
                                                            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                            <p>Nenhuma transação nesta fatura.</p>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </>
                            ) : invoiceTab === 'subscriptions' ? (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {/* Pega todas as transações recorrentes da fatura atual */}
                                    {(() => {
                                        const subTxs = transactions.filter(t => {
                                            if (t.cardId !== viewingInvoice.id || t.type !== 'expense' || !t.isRecurring) return false;
                                            const tInvoiceDate = getTransactionInvoiceDate(t.date, viewingInvoice.closing_day);
                                            return tInvoiceDate.getTime() === currentInvoiceDate.getTime();
                                        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                        return (
                                            <>
                                                {subTxs.map(sub => (
                                                    <div key={sub.id} className="flex justify-between items-center p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center text-purple-500">
                                                                <CalendarClock className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 dark:text-white">{sub.description}</p>
                                                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                                    Data da cobrança: {new Date(sub.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="font-bold text-slate-800 dark:text-white block mb-0.5">
                                                                R$ {sub.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <span className="text-[10px] uppercase font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">
                                                                RECORRENTE
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {subTxs.length === 0 && (
                                                    <div className="text-center py-8 text-slate-400">
                                                        <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                        <p>Nenhuma assinatura ativa nesta fatura.</p>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {/* Pega todas as transações de pagamento de fatura deste cartão */}
                                    {(() => {
                                        const paymentTxs = transactions.filter(t =>
                                            t.cardId === viewingInvoice.id &&
                                            t.type === 'expense' &&
                                            t.description.toLowerCase().includes('pagamento de fatura')
                                        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                        return (
                                            <>
                                                {paymentTxs.map(payment => (
                                                    <div key={payment.id} className="flex justify-between items-center p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                                <Check className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 dark:text-white">{payment.description}</p>
                                                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    Data do Pag.: {new Date(payment.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="font-bold text-slate-800 dark:text-white block mb-0.5">
                                                                R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                                                                PAGO
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {paymentTxs.length === 0 && (
                                                    <div className="text-center py-8 text-slate-400">
                                                        <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                        <p>Nenhum histórico de pagamento registrado.</p>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceViewer;
