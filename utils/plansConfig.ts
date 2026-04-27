import { PlanType } from '../types';

export const PLANS = {
  FREE: {
    id: 'FREE' as PlanType,
    name: 'Trocô Free',
    price: 0,
    priceLabel: 'R$ 0/mês',
    benefits: [
      'Até 15 lançamentos/mês',
      'Até 2 contas bancárias',
      'Até 3 assinaturas',
      'Até 5 lembretes',
      'Sem Agente de IA',
    ],
    checkoutUrl: null,
  },
  ESSENCIAL: {
    id: 'ESSENCIAL' as PlanType,
    name: 'Trocô Essencial',
    price: 34.90,
    priceLabel: 'R$ 34,90/mês',
    benefits: [
      'Lançamentos Ilimitados',
      'Cartões de Crédito Ilimitados',
      'Metas Financeiras Ilimitadas',
      'Até 100 interações com a IA',
    ],
    checkoutUrl: 'https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d', // TODO: User needs to update with actual link for Essencial
  },
  INTELIGENTE: {
    id: 'INTELIGENTE' as PlanType,
    name: 'Trocô Inteligente',
    price: 59.90,
    priceLabel: 'R$ 59,90/mês',
    benefits: [
      'Tudo do Essencial',
      'Agente WhatsApp IA',
      'Gestão de Investimentos',
      'Até 400 interações com a IA',
    ],
    checkoutUrl: 'https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d', // TODO: User needs to update with actual link for Inteligente
  },
  PREMIUM: {
    id: 'PREMIUM' as PlanType,
    name: 'Trocô Premium',
    price: 99.90,
    priceLabel: 'R$ 99,90/mês',
    benefits: [
      'Tudo liberado',
      'Atendimento Prioritário',
      'Recursos e relatórios exclusivos',
      'Até 1.000 interações com a IA',
    ],
    checkoutUrl: 'https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d', // TODO: User needs to update with actual link for Premium
  }
};

export const getNextPlan = (currentPlan: PlanType = 'FREE') => {
  switch (currentPlan) {
    case 'FREE':
      return PLANS.ESSENCIAL;
    case 'ESSENCIAL':
      return PLANS.INTELIGENTE;
    case 'INTELIGENTE':
      return PLANS.PREMIUM;
    case 'PREMIUM':
      return PLANS.PREMIUM; // Already at max
    default:
      return PLANS.ESSENCIAL;
  }
};

export const getPlanDetails = (plan: PlanType) => {
  return PLANS[plan] || PLANS.FREE;
};
