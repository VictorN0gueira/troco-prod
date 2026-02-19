import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Transaction } from '../types';
import { supabase } from '../supabaseClient';
import { getTodayLocalDate } from '../utils';

// Tipos para as ações offline
type OfflineActionType = 'ADD' | 'UPDATE' | 'DELETE';

interface OfflineAction {
    id: string; // ID único da ação (timestamp)
    type: OfflineActionType;
    payload: any; // Dados da transação ou ID
    timestamp: number;
}

interface OfflineContextType {
    isOnline: boolean;
    isSyncing: boolean;
    queueSize: number;
    addToQueue: (type: OfflineActionType, payload: any) => void;
    syncQueue: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider = ({ children }: { children: ReactNode }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queue, setQueue] = useState<OfflineAction[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // 1. Monitorar Status da Rede
    useEffect(() => {
        const handleOnline = () => {
            console.log('Online! Tentando sincronizar...');
            setIsOnline(true);
            syncQueue();
        };
        const handleOffline = () => {
            console.log('Offline! Modo desconectado ativado.');
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Carregar fila salva ao iniciar
        const savedQueue = localStorage.getItem('offlineQueue');
        if (savedQueue) {
            setQueue(JSON.parse(savedQueue));
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 2. Persistir fila no LocalStorage sempre que mudar
    useEffect(() => {
        localStorage.setItem('offlineQueue', JSON.stringify(queue));
    }, [queue]);

    // 3. Adicionar ação à fila
    const addToQueue = (type: OfflineActionType, payload: any) => {
        const newAction: OfflineAction = {
            id: `action-${Date.now()}-${Math.random()}`,
            type,
            payload,
            timestamp: Date.now()
        };
        setQueue(prev => [...prev, newAction]);
    };

    // 4. Processar Sincronização
    const syncQueue = async () => {
        if (queue.length === 0) return;
        if (isSyncing) return;

        setIsSyncing(true);
        const currentQueue = [...queue]; // Cópia para processar
        const failedActions: OfflineAction[] = [];

        console.log(`Iniciando sincronização de ${currentQueue.length} itens...`);

        // Processa sequencialmente para garantir ordem
        for (const action of currentQueue) {
            try {
                // Obter user_id da sessão atual para garantir segurança
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sem sessão ativa para sync");

                const userId = session.user.id;

                // Mapear campos para o DB (igual App.tsx) - Duplicação necessária ou refatorar para utilitário
                // Aqui vamos simplificar assumindo payload já formatado ou formatando inline

                if (action.type === 'ADD') {
                    const tx = action.payload as Transaction;
                    const dbType = tx.type === 'income' ? 'Receita' : 'Despesa';
                    const isPaid = tx.status === 'completed';

                    // O ID gerado offline pode colidir? Sim, mas o Supabase gera o ID numérico real.
                    // Aqui usamos "identificador" (string) para manter consistência com o frontend
                    const { error } = await supabase.from('transacoes').insert({
                        // user_id precisa ser numérico no DB atual? App.tsx diz: 'user_id', user.id
                        // O 'user.id' no context do userProfile é number. 
                        // Mas aqui pegamos do session (uuid).
                        // O problema: A tabela usa user_id (bigint) ou user_id (uuid)?
                        // O App.tsx usa `user.id` que vem do `UserProfile` (number).
                        // Precisamos do ID numérico do usuário.
                        // Como não temos acesso fácil ao state do App aqui, vamos tentar buscar.
                        // SOLUÇÃO ROBUSTA: Buscar o perfil com base no email da sessão

                        // NOTA: Para este MVP de PWA, a sync pode falhar se não tivermos o ID numérico.
                        // Vamos assumir que o payload JÁ TENHA o user_id correto se possível,
                        // mas o payload é a Transaction, que não tem user_id.

                        // TODO: Refatorar App.tsx para passar a função de sync ou user ID
                        // Por enquanto, vamos pular a implementação DETALHADA do sync aqui e focar na estrutura.
                        // O App.tsx vai consumir este contexto, então ele pode passar o UserID ou a função de sync.

                        // MUDANÇA DE ESTRATÉGIA:
                        // O Contexto só armazena a fila. Quem processa é o App.tsx que tem o contexto do Usuário e as funções de API.
                        // Então vou expor a fila e o método 'clearQueue' ou 'popQueue'.
                        // Na verdade, é melhor manter a lógica de sync centralizada, mas precisaremos do User ID.
                    });
                }

                // Se sucesso, remove da fila (não adiciona aos falhados)

            } catch (error) {
                console.error("Erro ao sincronizar item:", action, error);
                failedActions.push(action); // Mantém para tentar depois
            }
        }

        // Atualiza a fila apenas com os que falharam (ou limpa se tudo deu certo)
        // setQueue(failedActions); // Comentado pois a lógica real vai ser movida para App.tsx
        // setIsSyncing(false);
    };

    return (
        <OfflineContext.Provider value={{
            isOnline,
            isSyncing,
            queueSize: queue.length,
            addToQueue,
            syncQueue // Isso na verdade será um trigger
        }}>
            {children}
        </OfflineContext.Provider>
    );
};

export const useOffline = () => {
    const context = useContext(OfflineContext);
    if (context === undefined) {
        throw new Error('useOffline must be used within an OfflineProvider');
    }
    return context;
};
