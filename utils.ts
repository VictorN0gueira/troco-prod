import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Retorna a data atual no formato YYYY-MM-DD baseada no fuso horário LOCAL do usuário.
 * Evita o problema do toISOString() que converte para UTC e pode retornar o dia seguinte/anterior.
 */
export const getTodayLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formata uma string YYYY-MM-DD para DD/MM/YYYY (Padrão BR).
 * Faz o split manual da string para garantir que não haja conversão de timezone pelo objeto Date.
 */
export const formatDateDisplay = (dateString: string): string => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Helper para gerar ID de transação (Estilo N8N/WhatsApp)
 */
export const generateTransactionId = (length: number = 5): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Retorna um objeto Date configurado para o início do dia (00:00:00) no horário local.
 * Essencial para comparar datas de filtros com datas do banco.
 */
// ... existing code ...
// ... existing code ...
export const parseDateFromDB = (dateString: string): Date => {
  // Adiciona T00:00:00 para forçar o parse como "Local Time" ao invés de UTC
  return new Date(`${dateString}T00:00:00`);
};

/**
 * Determina a qual "Mês de Referência" (Fatura) uma transação pertence.
 * Se a compra foi feita DEPOIS ou NO DIA do fechamento, ela pertence à fatura do mês seguinte.
 */
export const getInvoiceReferenceDate = (transactionDate: string, closingDay: number): Date => {
  const date = parseDateFromDB(transactionDate);
  const day = date.getDate();

  // Se passou do fechamento, joga para o mês seguinte (primeiro dia do mês)
  if (day >= closingDay) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  }

  // Senão, é do próprio mês da compra
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

// ... existing code ...

// --- LOGICA DE RECORRÊNCIA CENTRALIZADA ---

/**
 * Projeta transações recorrentes para um determinado mês/ano.
 * Retorna uma lista contendo:
 * 1. Transações reais do mês
 * 2. Transações recorrentes projetadas (virtuais) que não tenham conflito com reais.
 */
import { Transaction } from './types';

export const getProjectedTransactions = (
  allTransactions: Transaction[],
  targetMonth: number,
  targetYear: number
): Transaction[] => {
  const daysInViewMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const projected: Transaction[] = [];

  // 1. Filtra transações REAIS que pertencem a este mês
  const realTransactions = allTransactions.filter(t => {
    const tDate = parseDateFromDB(t.date);
    return tDate.getMonth() === targetMonth && tDate.getFullYear() === targetYear;
  });

  // Adiciona as reais na lista final
  projected.push(...realTransactions);

  // 2. Projeta as recorrentes
  allTransactions.forEach(t => {
    if (!t.isRecurring) return;

    const tDate = parseDateFromDB(t.date);
    const tYear = tDate.getFullYear();
    const tMonth = tDate.getMonth();
    const tDay = tDate.getDate();

    // Verifica se a transação original é anterior ao mês alvo
    const isBeforeTarget = (tYear < targetYear) || (tYear === targetYear && tMonth < targetMonth);

    if (isBeforeTarget) {
      // Mantém o mesmo dia do mês, limitando ao último dia do mês atual
      const targetDay = Math.min(tDay, daysInViewMonth);

      const monthStr = String(targetMonth + 1).padStart(2, '0');
      const dayStr = String(targetDay).padStart(2, '0');
      const projectedDateStr = `${targetYear}-${monthStr}-${dayStr}`;

      // DEDUPLICAÇÃO:
      // Verifica se já existe uma REAL neste dia com mesmos dados
      const alreadyExistsConcrete = realTransactions.some(existing =>
        existing.date === projectedDateStr &&
        existing.description.toLowerCase().trim() === t.description.toLowerCase().trim() &&
        existing.type === t.type &&
        !existing.isRecurring
      );

      if (!alreadyExistsConcrete) {
        const virtualTx: Transaction = {
          ...t,
          date: projectedDateStr, // Data projetada
          id: `${t.id}-rec-${targetYear}-${targetMonth}`, // ID Virtual
          status: 'pending', // Sempre pendente
          isRecurring: true // Mantém flag visualmente
        };
        projected.push(virtualTx);
      }
    }
  });

  return projected;
};

/**
 * Normaliza um registro bruto do banco de dados para o tipo Transaction do frontend.
 * Trata a tradução de tipo (Receita/Despesa → income/expense) e campos opcionais.
 * Centralizado aqui para evitar duplicação entre o fetch inicial e o listener realtime.
 */
export const formatTransaction = (t: any): Transaction => {
  let finalType: 'income' | 'expense' = 'expense';
  const typeLower = (t.tipo || '').toLowerCase();

  if (typeLower === 'receita' || typeLower === 'income') {
    finalType = 'income';
  } else if (typeLower === 'despesa' || typeLower === 'expense') {
    finalType = 'expense';
  } else {
    // Heurística de fallback para tipos inválidos
    const descLower = (t.descricao || '').toLowerCase();
    const incomeKeywords = [
      'salário', 'salario', 'recebimento', 'venda', 'pix recebido',
      'depósito', 'cashback', 'lucro', 'rendimento', 'reembolso'
    ];
    if (incomeKeywords.some(k => descLower.includes(k))) {
      finalType = 'income';
    }
  }

  return {
    id: t.identificador || t.id.toString(),
    description: t.descricao,
    amount: Number(t.valor),
    type: finalType,
    category: t.categoria || 'Outros',
    date: t.data,
    status: t.esta_pago ? 'completed' : 'pending',
    isRecurring: t.is_recurring,
    cardId: t.card_id,
    installment_group: t.installment_group
  };
};
