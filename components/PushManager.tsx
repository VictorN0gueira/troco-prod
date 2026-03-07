import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

export function PushManager({ userId }: { userId: number }) {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const { showNotification } = useNotification();

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
            const locallyEnabled = localStorage.getItem(`troco_notifications_enabled_${userId}`);
            if (Notification.permission === 'granted' && locallyEnabled === 'true') {
                setIsSubscribed(true);
            }
        }
    }, [userId]);

    const subscribeUser = async () => {
        if (!('Notification' in window)) {
            showNotification({
                title: 'Erro',
                message: 'Seu navegador não suporta notificações.',
                type: 'error'
            });
            return;
        }

        setLoading(true);
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm === 'granted') {
                localStorage.setItem(`troco_notifications_enabled_${userId}`, 'true');
                setIsSubscribed(true);
                showNotification({
                    title: 'Sucesso',
                    message: 'Notificações ativadas com sucesso! 🔔',
                    type: 'success'
                });

                // Example Notification just to prove it works
                new Notification('Trocô — Lembrete 🔔', {
                    body: 'Exemplo de notificação! Você será avisado sobre contas a vencer.',
                    icon: '/icon.svg'
                });

            } else {
                localStorage.setItem(`troco_notifications_enabled_${userId}`, 'false');
                setIsSubscribed(false);
                showNotification({
                    title: 'Atenção',
                    message: 'Permissão para notificações foi negada.',
                    type: 'warning'
                });
            }

        } catch (err: any) {
            console.error('Failed to subscribe:', err);
            showNotification({
                title: 'Erro',
                message: 'Erro ao ativar notificações.',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    if (!('Notification' in window)) {
        return null; // Not supported
    }

    return (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isSubscribed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {isSubscribed ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                </div>
                <div>
                    <h4 className="font-semibold text-slate-800 dark:text-white">Notificações Push</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {isSubscribed ? 'Ativo: Receber alertas de vencimento.' : 'Ative para não perder prazos.'}
                    </p>
                </div>
            </div>

            <button
                onClick={subscribeUser}
                disabled={loading || isSubscribed}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isSubscribed
                    ? 'bg-transparent text-emerald-600 cursor-default'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                    }`}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSubscribed ? 'Ativado' : 'Ativar')}
            </button>
        </div>
    );
}
