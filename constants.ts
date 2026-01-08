import React from 'react';
import { 
  Utensils, 
  Car, 
  Gamepad2, 
  Stethoscope, 
  GraduationCap, 
  Home, 
  Shirt, 
  Briefcase, 
  Smartphone, 
  CreditCard, 
  Receipt, 
  Dog, 
  Gift, 
  Sparkles, 
  ShoppingCart, 
  Wrench, 
  Tv, 
  Building2, 
  Target, 
  TrendingUp, 
  Box 
} from 'lucide-react';

// --- CONSTANTS ---

// Strings limpas para o Banco de Dados
export const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Lazer',
  'Saúde',
  'Educação',
  'Moradia',
  'Vestuário',
  'Trabalho',
  'Tecnologia',
  'Financeiro',
  'Impostos & Taxas',
  'Pets',
  'Presentes',
  'Cuidados Pessoais',
  'Compras Online',
  'Manutenção',
  'Assinaturas',
  'Negócios / Empresa',
  'Marketing & Publicidade',
  'Investimentos',
  'Outros'
];

// Mapeamento Visual de Ícones
export const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Alimentação': Utensils,
  'Transporte': Car,
  'Lazer': Gamepad2,
  'Saúde': Stethoscope,
  'Educação': GraduationCap,
  'Moradia': Home,
  'Vestuário': Shirt,
  'Trabalho': Briefcase,
  'Tecnologia': Smartphone,
  'Financeiro': CreditCard,
  'Impostos & Taxas': Receipt,
  'Pets': Dog,
  'Presentes': Gift,
  'Cuidados Pessoais': Sparkles,
  'Compras Online': ShoppingCart,
  'Manutenção': Wrench,
  'Assinaturas': Tv,
  'Negócios / Empresa': Building2,
  'Marketing & Publicidade': Target,
  'Investimentos': TrendingUp,
  'Outros': Box
};

export const LOGO_URL = "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FTroc%C3%B4%2FLogo%20-%20Sem%20Fundo%20Branco%20e%20Sem%20Nome.png&version_id=null";