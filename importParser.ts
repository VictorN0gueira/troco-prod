import Papa from 'papaparse';
import { Transaction } from './types';
import { generateTransactionId } from './utils';

// Normalized Intermediate Format
export interface ParsedTransaction {
    date: string; // YYYY-MM-DD
    amount: number;
    description: string;
    type: 'income' | 'expense';
    category?: string; // Add guessed category
    originalRow?: any; // Just for debugging or hashing
}

// Auto-categorization engine
const CATEGORY_RULES: Record<string, string[]> = {
    'Alimentação': ['ifood', 'rappi', 'mcdonalds', 'burger king', 'mercado', 'supermercado', 'carrefour', 'pao de acucar', 'padaria', 'restaurante', 'lanchonete', 'z\u00e9 delivery', 'ze delivery'],
    'Transporte': ['uber', '99', 'cabify', 'posto', 'gasolina', 'combustivel', 'ipiranga', 'shell', 'petrobras', 'sem parar', 'veloe', 'estacionamento'],
    'Moradia': ['enel', 'light', 'cpfl', 'sabesp', 'copasa', 'sanepar', 'condominio', 'aluguel', 'iptu', 'comgas', 'naturgy'],
    'Saúde': ['farmacia', 'drogasil', 'droga raia', 'pague menos', 'unimed', 'amil', 'sulam\u00e9rica', 'hospital', 'clinica', 'medico', 'dentista'],
    'Lazer': ['cinema', 'cinemark', 'ingresso', 'netflix', 'spotify', 'amazon prime', 'disney', 'hbomax', 'playstation', 'xbox', 'steam', 'bar', 'pub', 'show'],
    'Compras': ['amazon', 'mercado livre', 'shopee', 'aliexpress', 'shein', 'magalu', 'americanas', 'casas bahia', 'renner', 'riachuelo', 'zara'],
    'Educação': ['faculdade', 'escola', 'curso', 'udemy', 'alura', 'estacio', 'mackenzie', 'livraria'],
    'Impostos/Taxas': ['darf', 'iof', 'tarifa', 'anuidade', 'multa', 'juros', 'imposto'],
    'Salário': ['salario', 'salary', 'adiantamento', 'pagamento', 'rh', 'folha'],
    'Investimentos': ['xp', 'rico', 'clear', 'avenue', 'nu invest', 'clear', 'btg', 'binance', 'tesouro']
};

export const suggestCategory = (description: string, type: 'income' | 'expense'): string => {
    const lowerDesc = description.toLowerCase();

    if (type === 'income') {
        const salaryKeywords = CATEGORY_RULES['Salário'];
        if (salaryKeywords.some(kw => lowerDesc.includes(kw))) return 'Salário';
        const invKeywords = CATEGORY_RULES['Investimentos'];
        if (invKeywords.some(kw => lowerDesc.includes(kw))) return 'Investimentos';
        return 'Outros'; // Default income
    }

    for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
        if (keywords.some(kw => lowerDesc.includes(kw))) {
            return category;
        }
    }

    return 'Outros'; // Default expense
};

// 1. OFX Parser (XML-like standard from banks)
export const parseOFX = async (fileContent: string): Promise<ParsedTransaction[]> => {
    const transactions: ParsedTransaction[] = [];

    // Split into chunks by <STMTTRN> because OFX can be weirdly formatted without line breaks
    const blocks = fileContent.split(/<STMTTRN>/i);
    blocks.shift(); // Remove the header part before the first transaction

    for (const block of blocks) {
        // Extract TRNAMT
        const amtMatch = block.match(/<TRNAMT>([-\d.,]+)/i);
        // Extract DTPOSTED
        const dtMatch = block.match(/<DTPOSTED>([\d]{8})/i); // Usually YYYYMMDD
        // Extract MEMO or NAME
        let nameMatch = block.match(/<MEMO>(.*?)<\/MEMO>|<MEMO>(.*?)<.*?>/i);
        if (!nameMatch) {
            nameMatch = block.match(/<NAME>(.*?)<\/NAME>|<NAME>(.*?)<.*?>/i);
        }

        // Fallback for tricky OFX files where nodes don't close properly on the same line
        if (!nameMatch) {
            const memoFallback = block.match(/<MEMO>([^\n\r]+)/i);
            const nameFallback = block.match(/<NAME>([^\n\r]+)/i);
            nameMatch = memoFallback || nameFallback;
        }

        if (amtMatch && dtMatch) {
            let amountRaw = amtMatch[1].replace(',', '.'); // Ensure dot decimal
            const amount = parseFloat(amountRaw);

            // Format date from YYYYMMDD to YYYY-MM-DD
            const rawDate = dtMatch[1];
            const date = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;

            // Clean name and sanitize
            let rawDescription = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[0]).replace(/<\/.*?>/g, '').trim() : 'Transação Desconhecida';

            // Security: Truncate and sanitize description to prevent UI breaking or long-string attacks
            const description = rawDescription.substring(0, 150).replace(/[<>]/g, '');

            // OFX Amounts: negative means expense, positive means income usually
            const type: 'income' | 'expense' = amount >= 0 ? 'income' : 'expense';
            const absoluteAmount = Math.abs(amount);

            transactions.push({
                date,
                amount: absoluteAmount,
                description,
                type,
                category: suggestCategory(description, type),
                originalRow: block.trim().substring(0, 1000) // Limit stored raw data
            });
        }
    }

    // Security: Limit total imported transactions per file to prevent memory exhaustion
    return transactions.slice(0, 500);
};

// 2. CSV Parser (NuBank, Inter, generic)
export const parseCSV = async (file: File): Promise<ParsedTransaction[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const transactions: ParsedTransaction[] = [];
                const data = results.data as any[];

                // Determine columns dynamically (since different banks use different layouts)
                if (data.length === 0) return resolve([]);

                const sampleFields = Object.keys(data[0]).map(k => k.toLowerCase());

                // Identify Date column
                const dateCol = sampleFields.find(f => f.includes('data') || f.includes('date'));
                // Identify Description column
                const descCol = sampleFields.find(f => f.includes('descri') || f.includes('historico') || f.includes('title') || f.includes('title'));
                // Identify Amount column
                const amountCol = sampleFields.find(f => f.includes('valor') || f.includes('amount'));

                if (!dateCol || !descCol || !amountCol) {
                    console.error("Colunas não identificadas no CSV. Achadas: ", sampleFields);
                    return resolve([]); // Ou lançar erro legível
                }

                const origDateKey = Object.keys(data[0]).find(k => k.toLowerCase() === dateCol) || dateCol;
                const origDescKey = Object.keys(data[0]).find(k => k.toLowerCase() === descCol) || descCol;
                const origAmountKey = Object.keys(data[0]).find(k => k.toLowerCase() === amountCol) || amountCol;

                for (const row of data) {
                    let rawDate = row[origDateKey];
                    let rawDesc = row[origDescKey];
                    let rawAmount = row[origAmountKey];

                    if (!rawDate || !rawAmount) continue;

                    // Parse Date (Usually DD/MM/YYYY in Brazil)
                    let date = rawDate;
                    if (rawDate.includes('/')) {
                        const parts = rawDate.split('/');
                        if (parts.length === 3) {
                            // If year is 2 digits or 4 digits
                            let year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                            date = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                        }
                    } else if (rawDate.includes('-')) {
                        // might already be YYYY-MM-DD
                    }

                    // Parse Amount
                    let amountStr = String(rawAmount).replace(/[^\d.,-]/g, '');
                    // Handle Brazilian format (1.000,00) vs US format (1,000.00)
                    let amountVal = 0;
                    if (amountStr.lastIndexOf(',') > amountStr.lastIndexOf('.')) {
                        // BR Format
                        amountVal = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
                    } else {
                        // US Format
                        amountVal = parseFloat(amountStr.replace(/,/g, ''));
                    }

                    if (isNaN(amountVal)) continue;

                    const type: 'income' | 'expense' = amountVal >= 0 ? 'income' : 'expense';
                    const absoluteAmount = Math.abs(amountVal);

                    // Security: Sanitize and truncate description
                    const description = (rawDesc ? String(rawDesc).trim() : 'Fatura Cartão').substring(0, 150).replace(/[<>]/g, '');

                    transactions.push({
                        date,
                        amount: absoluteAmount,
                        description,
                        type,
                        category: suggestCategory(description, type),
                        originalRow: JSON.stringify(row).substring(0, 500) // Limit stored raw data
                    });
                }
                resolve(transactions.slice(0, 500)); // Security: Result limit
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};

// Orchestrator
export const parseStatementFile = async (file: File): Promise<ParsedTransaction[]> => {
    const filename = file.name.toLowerCase();

    if (filename.endsWith('.csv')) {
        return await parseCSV(file);
    } else if (filename.endsWith('.ofx') || filename.endsWith('.txt')) {
        // Leio OFX como texto e passo pro parser
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    try {
                        const res = await parseOFX(text);
                        resolve(res);
                    } catch (err) {
                        reject(err);
                    }
                } else {
                    reject(new Error("Falha ao ler o arquivo como texto."));
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    } else {
        throw new Error("Formato não suportado. Envie um arquivo .OFX ou .CSV");
    }
};
