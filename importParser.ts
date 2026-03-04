import Papa from 'papaparse';
import { Transaction } from './types';
import { generateTransactionId } from './utils';

// Normalized Intermediate Format
export interface ParsedTransaction {
    date: string; // YYYY-MM-DD
    amount: number;
    description: string;
    type: 'income' | 'expense';
    originalRow?: any; // Just for debugging or hashing
}

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

            // Clean name
            let description = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[0]).replace(/<\/.*?>/, '').trim() : 'Transação Desconhecida';

            // OFX Amounts: negative means expense, positive means income usually
            const type: 'income' | 'expense' = amount >= 0 ? 'income' : 'expense';
            const absoluteAmount = Math.abs(amount);

            transactions.push({
                date,
                amount: absoluteAmount,
                description,
                type,
                originalRow: block.trim()
            });
        }
    }

    return transactions;
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

                    transactions.push({
                        date,
                        amount: absoluteAmount,
                        description: rawDesc ? String(rawDesc).trim() : 'Fatura Cartão',
                        type,
                        originalRow: row
                    });
                }
                resolve(transactions);
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
