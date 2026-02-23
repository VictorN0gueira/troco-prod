import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Bell, BellOff, Loader2 } from 'lucide-react';

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

export function PushManager({ userId, isEnabled, onToggle }: { userId: number, isEnabled: boolean, onToggle: (val: boolean) => Promise<void> }) {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');

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

            // Update Database: profiles.notificacoes_push = true
            await onToggle(true);

            // Send to push_subscriptions table
            const { error } = await supabase.from('push_subscriptions').upsert({
                user_id: userId,
                endpoint: subscription.endpoint,
                p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')!) as any)),
                auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')!) as any))
            }, { onConflict: 'user_id' });

            if (error) throw error;

            setIsSubscribed(true);
            setPermission('granted');
            alert("Notificações ativadas com sucesso! 🔔");

        } catch (err: any) {
            console.error('Failed to subscribe:', err);
            // Revert UI if needed
            await onToggle(false);
            alert('Erro ao ativar notificações: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const unsubscribeUser = async () => {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
            }

            // Remove from Supabase push_subscriptions
            await supabase.from('push_subscriptions').delete().eq('user_id', userId);

            // Update Database: profiles.notificacoes_push = false
            await onToggle(false);

            setIsSubscribed(false);
            alert("Notificações desativadas.");

        } catch (err: any) {
            console.error('Failed to unsubscribe:', err);
            alert('Erro ao desativar notificações: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!('serviceWorker' in navigator)) {
        return null; // Not supported
    }

    // UI State: isEnabled is the source of truth from Database
    // isSubscribed is the browser state
    const active = isEnabled && isSubscribed;

    return (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {active ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                </div>
                <div>
                    <h4 className="font-semibold text-slate-800 dark:text-white">Notificações Push</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {active ? 'Ativo: Receber alertas de vencimento.' : 'Ative para não perder prazos.'}
                    </p>
                </div>
            </div>

            <button
                onClick={active ? unsubscribeUser : subscribeUser}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${active
                    ? 'bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/30'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                    }`}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (active ? 'Desativar' : 'Ativar')}
            </button>
        </div>
    );
}
