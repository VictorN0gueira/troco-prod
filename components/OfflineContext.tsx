import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { offlineQueueService } from '../localdb';

// Tipos para as ações offline
type OfflineActionType = 'ADD' | 'UPDATE' | 'DELETE';

interface OfflineAction {
    id: string;
    type: OfflineActionType;
    payload: any;
    timestamp: number;
}

interface OfflineContextType {
    isOnline: boolean;
    isSyncing: boolean;
    queueSize: number;
    addToQueue: (type: OfflineActionType, payload: any) => void;
    syncQueue: () => Promise<void>;
    // Expõe a fila e helpers para o App.tsx processar com user_id correto
    queue: OfflineAction[];
    clearQueue: () => void;
    removeFromQueue: (id: string) => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider = ({ children }: { children: ReactNode }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queue, setQueue] = useState<OfflineAction[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // 1. Carregar fila salva do LocalForage ao montar
    useEffect(() => {
        const loadQueue = async () => {
            const savedQueue = await offlineQueueService.getQueue();
            if (savedQueue && savedQueue.length > 0) {
                setQueue(savedQueue);
            }
        };
        loadQueue();
    }, []);

    // 2. Monitorar status da rede e visibilidade
    useEffect(() => {
        const handleOnline = () => {
            console.log('[Offline] Online detectado.');
            setIsOnline(true);
        };
        const handleOffline = () => {
            console.log('[Offline] Modo desconectado ativado.');
            setIsOnline(false);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                // Força re-checagem do estado online ao voltar pro app
                setIsOnline(true);
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // 3. Persistir fila no LocalForage sempre que mudar
    useEffect(() => {
        offlineQueueService.saveQueue(queue);
    }, [queue]);

    // 4. Adicionar ação à fila
    const addToQueue = useCallback((type: OfflineActionType, payload: any) => {
        const newAction: OfflineAction = {
            id: `action-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type,
            payload,
            timestamp: Date.now()
        };
        setQueue(prev => [...prev, newAction]);
    }, []);

    // 5. Remover ação específica da fila (chamado pelo App.tsx após processar com sucesso)
    const removeFromQueue = useCallback((id: string) => {
        setQueue(prev => prev.filter(a => a.id !== id));
    }, []);

    // 6. Limpar toda a fila
    const clearQueue = useCallback(() => {
        setQueue([]);
    }, []);

    // 7. syncQueue: trigger para que o App.tsx saiba que deve processar a fila
    // O App.tsx consome `queue` + `removeFromQueue` com o user_id correto.
    // Esta função serve como indicador de sincronização em andamento.
    const syncQueue = useCallback(async () => {
        if (queue.length === 0 || isSyncing) return;
        setIsSyncing(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
        } finally {
            setIsSyncing(false);
        }
    }, [queue.length, isSyncing]);

    return (
        <OfflineContext.Provider value={{
            isOnline,
            isSyncing,
            queueSize: queue.length,
            addToQueue,
            syncQueue,
            queue,
            clearQueue,
            removeFromQueue,
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
