import { Transaction, Budget } from './types';
import { parseDateFromDB } from './utils';

export interface DailyProjection {
    day: number;
    dateStr: string;
    balance: number;
    income: number;
    expense: number;
}

export function generateCashflowProjection(
    monthTransactions: Transaction[],
    budgets: Budget[],
    viewMonth: number,
    viewYear: number
): DailyProjection[] {
    // 1. Setup the array of days for the given month
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const projection: DailyProjection[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = String(d).padStart(2, '0');
        const monthStr = String(viewMonth + 1).padStart(2, '0');
        projection.push({
            day: d,
            dateStr: `${viewYear}-${monthStr}-${dayStr}`,
            balance: 0,
            income: 0,
            expense: 0
        });
    }

    // 2. Aggregate transactions into valid days
    // monthTransactions has both real and virtual recurring already injected by Dashboard processing
    monthTransactions.forEach(t => {
        const d = parseDateFromDB(t.date);
        if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
            const dayIndex = d.getDate() - 1;
            const amt = Number(t.amount);
            if (t.type === 'income') {
                projection[dayIndex].income += amt;
            } else {
                projection[dayIndex].expense += amt;
            }
        }
    });

    // 3. Handle Budgets Projection
    const today = new Date();
    const isCurrentMonth = today.getMonth() === viewMonth && today.getFullYear() === viewYear;
    const isFutureMonth = (viewYear > today.getFullYear()) || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

    if (isCurrentMonth || isFutureMonth) {
        const startDayForBudget = isCurrentMonth ? today.getDate() + 1 : 1;
        const daysRemaining = daysInMonth - startDayForBudget + 1;

        if (daysRemaining > 0) {
            budgets.forEach(b => {
                // Calculate how much was already spent in this budget category this month
                const spent = monthTransactions
                    .filter(t => t.type === 'expense' && t.category === b.categoria)
                    .reduce((sum, t) => sum + Number(t.amount), 0);

                const remaining = Number(b.valor_limite) - spent;
                if (remaining > 0) {
                    // Distribute remaining budget evenly across the remaining days of the month
                    const dailyBudgetExpense = remaining / daysRemaining;
                    for (let d = startDayForBudget; d <= daysInMonth; d++) {
                        projection[d - 1].expense += dailyBudgetExpense;
                    }
                }
            });
        }
    }

    // 4. Calculate Running Balance
    // For projection purposes within a month view, we start at 0 and accumulate the net
    let runningBalance = 0;
    for (let d = 0; d < daysInMonth; d++) {
        runningBalance += (projection[d].income - projection[d].expense);
        projection[d].balance = runningBalance;
    }

    return projection;
}
