import React from 'react';

export type TransactionType = 'income' | 'expense';

export type InvestmentType =
  // Brasil
  | 'Ações'
  | 'FII'
  | 'ETF'
  | 'BDR'
  | 'Tesouro Direto'
  | 'Renda Fixa'
  | 'Debêntures'
  // Internacional
  | 'Stocks EUA'
  | 'REITs'
  // Crypto
  | 'Crypto'
  // Alternativos
  | 'Imóvel'
  | 'Previdência'
  | 'Commodities'
  // Genérico
  | 'Outros';

export interface Investment {
  id: string;
  user_id: number;
  name: string;
  ticker?: string;
  type: InvestmentType;
  quantity: number;
  purchase_price: number;
  current_price: number;
  purchase_date: string;
  broker?: string;
  notes?: string;
  created_at?: string;
}

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
  notificacoes_whatsapp?: boolean;
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
  cardId?: number; // ID do cartão de crédito (opcional)
  installment_group?: string; // ID único agrupando parcelas de uma mesma compra
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
  icon: any; // Using any for simplicity as Lucide icons are valid React components
  disabled?: boolean;
}

export interface CreditCard {
  id: number;
  user_id: number;
  name: string;
  limit_amount: number;
  current_usage: number;   // valor consumido do limite (DB-stored)
  closing_day: number;
  due_day: number;
  color: string;
  brand?: string;
  cashback_rate?: number;  // % de cashback (ex: 1.5 = 1,5%)
}

export interface InvestmentNews {
  title: string;
  description: string;
  url: string;
  image?: string;
  source: string;
  sourceColor?: string; // cor do badge da fonte (hex)
  timestamp: string;
  category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface Goal {
  id: string;
  user_id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string; // ISO date string YYYY-MM-DD
  color: string;
  icon: string;
  created_at?: string;
}