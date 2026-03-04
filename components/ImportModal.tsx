import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, FileType, CheckCircle2, AlertCircle, FileDigit, Trash2, ArrowRight } from 'lucide-react';
import { parseStatementFile, ParsedTransaction } from '../importParser';
import { Transaction } from '../types';
import { generateTransactionId } from '../utils';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (transactions: Transaction[]) => void;
}

export default function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parsedTxs, setParsedTxs] = useState<ParsedTransaction[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const processFile = async (file: File) => {
        setIsParsing(true);
        setError(null);
        try {
            const results = await parseStatementFile(file);
            if (results.length === 0) {
                setError('Nenhuma transação válida encontrada no arquivo.');
            } else {
                setParsedTxs(results);
                setSelectedIndices(new Set(results.map((_, i) => i))); // Select all by default
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao ler arquivo.');
        } finally {
            setIsParsing(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await processFile(e.target.files[0]);
        }
    };

    const toggleSelection = (index: number) => {
        const newSelection = new Set(selectedIndices);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedIndices(newSelection);
    };

    const handleImportSelected = () => {
        const toImport: Transaction[] = parsedTxs
            .filter((_, idx) => selectedIndices.has(idx))
            .map(t => ({
                id: generateTransactionId(6),
                description: t.description,
                amount: t.amount,
                type: t.type,
                category: 'Outros', // Default strategy, can be improved later
                date: t.date,
                status: 'completed'  // Assuming imported transactions are already completed at the bank
            }));

        onImport(toImport);
        onClose();
        // Cleanup state for next opening
        setTimeout(() => {
            setParsedTxs([]);
            setError(null);
        }, 300);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />

                <div className="relative transform overflow-visible bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl rounded-3xl animate-scale-in w-full flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center rounded-t-3xl shrink-0">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <UploadCloud className="w-6 h-6 text-primary-500" />
                            Importar Extrato (OFX / CSV)
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                        {parsedTxs.length === 0 ? (
                            // Step 1: Upload View
                            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".ofx,.csv,.txt"
                                    className="hidden"
                                />

                                <div
                                    className={`w-full flex flex-col items-center justify-center py-12 px-4 rounded-xl transition-colors cursor-pointer
                    ${isDragging ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}
                  `}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {isParsing ? (
                                        <div className="flex flex-col items-center animate-pulse">
                                            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                            <p className="mt-4 text-slate-500 font-medium">Lendo arquivo magico...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center mb-4">
                                                <FileType className="w-8 h-8 text-primary-500" />
                                            </div>
                                            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Arraste seu extrato aqui</h4>
                                            <p className="text-sm text-slate-500 text-center max-w-sm">
                                                Suportamos arquivos <strong>.OFX</strong> ou <strong>.CSV</strong> do Nubank, Itaú, Bradesco, Inter e mais.
                                            </p>
                                        </>
                                    )}
                                </div>

                                {error && (
                                    <div className="mt-4 flex items-center gap-2 text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-lg w-full">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <span className="text-sm font-medium">{error}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Step 2: Review List View
                            <div className="flex flex-col h-full animate-fade-in-up">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-bold text-slate-800 dark:text-white">Revisão Rápida</h4>
                                    <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 py-1 px-3 rounded-full text-xs font-bold">
                                        {parsedTxs.length} transações lidas
                                    </span>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                    <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
                                        {parsedTxs.map((t, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => toggleSelection(idx)}
                                                className={`p-3 flex items-center justify-between cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800
                            ${!selectedIndices.has(idx) ? 'opacity-50 grayscale' : ''}
                           `}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={`shrink-0 w-5 h-5 rounded flex items-center justify-center border-2 transition-colors
                                ${selectedIndices.has(idx) ? 'bg-primary-500 border-primary-500' : 'border-slate-300 dark:border-slate-600'}
                             `}>
                                                        {selectedIndices.has(idx) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{t.description}</p>
                                                        <p className="text-xs text-slate-500">{t.date}</p>
                                                    </div>
                                                </div>
                                                <div className={`shrink-0 text-sm font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <p className="text-xs text-slate-500 mt-4 text-center">
                                    Desmarque as transações que você não deseja importar (como pagamentos de fatura que geram duplicatas).
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {parsedTxs.length > 0 && (
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 rounded-b-3xl shrink-0 flex justify-between items-center">
                            <button
                                onClick={() => setParsedTxs([])} // Reset
                                className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={handleImportSelected}
                                disabled={selectedIndices.size === 0}
                                className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/30 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Importar {selectedIndices.size} Transações
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div >
    );
}
