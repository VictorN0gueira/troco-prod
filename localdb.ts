import localforage from 'localforage';
import { Transaction, UserProfile, Goal, CreditCard, Investment } from './types';

// Configure central instance
localforage.config({
    name: 'TrocoDB',
    storeName: 'troco_store', // Should be alphanumeric, with underscores.
    description: 'Local storage for offline capability'
});

// Create specific buckets for different data types to keep things clean
export const transactionsDB = localforage.createInstance({
    name: 'TrocoDB',
    storeName: 'transactions'
});

export const userDB = localforage.createInstance({
    name: 'TrocoDB',
    storeName: 'user_profile'
});

export const goalsDB = localforage.createInstance({
    name: 'TrocoDB',
    storeName: 'goals'
});

export const cardsDB = localforage.createInstance({
    name: 'TrocoDB',
    storeName: 'cards'
});

export const investmentsDB = localforage.createInstance({
    name: 'TrocoDB',
    storeName: 'investments'
});

export const budgetsDB = localforage.createInstance({
    name: 'TrocoDB',
    storeName: 'budgets'
});

export const accountsDB = localforage.createInstance({
    name: 'TrocoDB',
    storeName: 'accounts'
});

export const syncQueueDB = localforage.createInstance({
    name: 'TrocoDB',
    storeName: 'sync_queue'
});

export const gamificationDB = localforage.createInstance({
    name: 'TrocoDB',
    storeName: 'gamification'
});

// Helper for offline queue operations
export const offlineQueueService = {
    async getQueue() {
        try {
            const queue = await syncQueueDB.getItem('queue');
            return Array.isArray(queue) ? queue : [];
        } catch {
            return [];
        }
    },

    async saveQueue(queue: any[]) {
        try {
            await syncQueueDB.setItem('queue', queue);
        } catch (e) {
            console.error('Failed to save offline queue', e);
        }
    },

    async clearQueue() {
        try {
            await syncQueueDB.removeItem('queue');
        } catch (e) {
            console.error('Failed to clear offline queue', e);
        }
    }
};
