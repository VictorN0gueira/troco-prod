import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationOptions {
    title?: string;
    message: string;
    type?: NotificationType;
    duration?: number;
}

interface NotificationContextData {
    showNotification: (options: NotificationOptions) => void;
}

const NotificationContext = createContext<NotificationContextData>({} as NotificationContextData);

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<(NotificationOptions & { id: string })[]>([]);

    const showNotification = useCallback(({ title, message, type = 'info', duration = 5000 }: NotificationOptions) => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications(prev => [...prev, { id, title, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, duration);
        }
    }, []);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            {createPortal(
                <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
                    {notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`animate-fade-in-up flex items-start p-4 rounded-xl shadow-xl border w-80 pointer-events-auto backdrop-blur-sm ${notification.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800 dark:bg-emerald-900/90 dark:border-emerald-800 dark:text-emerald-100' :
                                    notification.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800 dark:bg-red-900/90 dark:border-red-800 dark:text-red-100' :
                                        notification.type === 'warning' ? 'bg-orange-50/90 border-orange-200 text-orange-800 dark:bg-orange-900/90 dark:border-orange-800 dark:text-orange-100' :
                                            'bg-blue-50/90 border-blue-200 text-blue-800 dark:bg-blue-900/90 dark:border-blue-800 dark:text-blue-100'
                                }`}
                        >
                            <div className="mr-3 mt-0.5 flex-shrink-0">
                                {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
                                {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
                                {notification.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                                {notification.type === 'info' && <Info className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                                {notification.title && <h4 className="font-bold text-sm mb-0.5">{notification.title}</h4>}
                                <p className="text-sm opacity-90 leading-tight">{notification.message}</p>
                            </div>
                            <button
                                onClick={() => removeNotification(notification.id)}
                                className="ml-3 mt-0.5 opacity-50 hover:opacity-100 transition-opacity"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </NotificationContext.Provider>
    );
};
