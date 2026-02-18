import React from 'react';

export type TransactionType = 'income' | 'expense';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due';

export interface UserProfile {
  id: number; // Matches BIGINT from public.usuarios
  nome: string;
  email: string;
  telefone: string;
  avatarUrl: string;
  status_assinatura?: SubscriptionStatus; // Mapped from 'tem_plano'
  // Campos de Notificação
  notificacoes_email?: boolean;
  notificacoes_push?: boolean;
  notificacoes_marketing?: boolean;
}

export interface Transaction {
  id: string; // Frontend uses string for IDs usually, we will cast to/from number for DB
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  status: 'completed' | 'pending';
  isRecurring?: boolean; // Nova flag para recorrência
}

// Chart types remain the same for UI visualization
export interface ChartDataPoint {
  name: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
  color: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}