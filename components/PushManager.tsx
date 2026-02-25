import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Base64 to ArrayBuffer utility needed for subscription
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function PushManager({ userId }: { userId: number }) {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const { showNotification } = useNotification();

    useEffect(() => {
        // Check initial state
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            checkSubscription();
            setPermission(Notification.permission);
        }
    }, []);

    const checkSubscription = async () => {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
    };

    const subscribeUser = async () => {
        if (!VAPID_PUBLIC_KEY) {
            console.error("VAPID Key not found");
            return;
        }

        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Send to Supabase
            const { error } = await supabase.from('push_subscriptions').insert({
                user_id: userId, // Ensure userId is valid
                endpoint: subscription.endpoint,
                p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')!) as any)),
                auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')!) as any))
            });

            if (error) throw error;

            setIsSubscribed(true);
            setPermission('granted');
            showNotification({
                title: 'Sucesso',
                message: 'Notificações ativadas com sucesso! 🔔',
                type: 'success'
            });

        } catch (err: any) {
            console.error('Failed to subscribe:', err);
            showNotification({
                title: 'Erro',
                message: 'Erro ao ativar notificações: ' + err.message,
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    if (!('serviceWorker' in navigator)) {
        return null; // Not supported
    }

    // Check for Super Trocô Plan
    // A propriedade de usuario para PushManager seria recebida por contexto se nao for por prop.
    // Mas PushManager só tem userId. Vamos importar algo ou tratar no componente pai?
    // Vamos buscar o usuario completo via context Auth se não tivermos. 
    // Wait, Trocô's app structure often passes `user` around. Let's add a check based on Supabase or Context.
    // However, realistically the App restricts rendering PushManager or its tab in Settings.
    // We can also let the Settings page handle `user.status_assinatura` since PushManager only has `userId`.

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
