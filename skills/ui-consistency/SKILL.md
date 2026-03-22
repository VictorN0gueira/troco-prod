---
name: UI Consistency
description: Regras e padrões para manter o design premium, responsividade e consistência visual do Trocô.
---

# Skill: UI Consistency

Esta skill deve ser consultada sempre que houver necessidade de criar novos componentes ou refatorar a UI.

## 🎨 Design System & Cores
- **Primária**: `#10B981` (Tailwind `emerald-500` / `primary-500`).
- **Escura (Cards/Dark Mode)**: `#151f32` (Tailwind `slate-850`).
- **Tipografia**: Montserrat (Sans-serif).
- **Estética**: Glassmorphism, bordas arredondadas (`rounded-2xl` ou `rounded-3xl`), sombras suaves e gradientes.

## 📱 Responsividade
- **Mobile First**: Sempre verifique se os elementos não quebram em telas pequenas.
- **Grades**: Use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` para layouts de cartões.
- **Padding**: Use `p-4 sm:p-5` para manter o espaçamento adequado em dispositivos móveis.

## ✨ Animações
- Use `framer-motion` para transições de estado.
- Utilize a classe `animate-fade-in-up` definida no `index.html` para entradas de página.
- Adicione `active:scale-95` em botões para feedback tátil.

## 🛠️ Componentes Proibidos
- Evite cores genéricas simples (ex: `red`, `blue`). Use a paleta do projeto.
- Não use `alert()` do navegador; use o `NotificationContext`.
