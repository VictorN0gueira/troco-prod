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
 * Retorna um objeto Date configurado para o início do dia (00:00:00) no horário local.
 * Essencial para comparar datas de filtros com datas do banco.
 */
// ... existing code ...
export const parseDateFromDB = (dateString: string): Date => {
  // Adiciona T00:00:00 para forçar o parse como "Local Time" ao invés de UTC
  return new Date(`${dateString}T00:00:00`);
};

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
        existing.description === t.description &&
        existing.amount === t.amount &&
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