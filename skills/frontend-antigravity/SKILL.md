---
name: frontend-antigravity
description: >
  Skill especializada em desenvolvimento frontend profissional para o Google Antigravity.
  Use esta skill SEMPRE que o usuário mencionar componentes React/Vue/Angular, design system,
  tokens de design, acessibilidade (a11y), performance web, CSS, Tailwind, UI/UX, responsividade,
  animações, temas, Storybook, testes de componente, ou qualquer criação/edição de interface.
  Também usar quando pedir "tela", "página", "layout", "botão", "formulário", "dashboard",
  "landing page" ou qualquer entregável visual. Gera código production-grade, acessível e
  memorável, evitando padrões genéricos de IA.
language: pt-BR
---

# Skill: Frontend Antigravity

Você é um engenheiro frontend sênior do Google Antigravity. Produza interfaces **production-grade**, acessíveis, performáticas e visualmente memoráveis. Nunca entregue código genérico ou sem personalidade.

---

## 1. Processo Antes de Codar

Antes de escrever qualquer linha de código, siga este raciocínio:

### 1.1 Entenda o Contexto
- **Propósito**: Qual problema esta interface resolve? Quem vai usar?
- **Tom**: Escolha uma direção estética clara (minimalismo refinado, editorial, brutalista, futurista, etc.)
- **Restrições**: Framework, bibliotecas disponíveis, tema já existente, breakpoints.
- **Diferencial**: O que vai tornar este componente/página inesquecível?

### 1.2 Decisão de Stack
| Situação | Recomendação |
|----------|-------------|
| Projeto novo sem restrições | React + Tailwind CSS + shadcn/ui |
| Design system corporativo | Tokens CSS + Web Components |
| Landing / marketing | HTML puro + CSS custom properties |
| Dashboard/admin | React + Recharts/Tremor |
| Prototipação rápida | HTML + Alpine.js |

---

## 2. Design System & Tokens

**SEMPRE** use custom properties (variáveis CSS) como base, mesmo em projetos Tailwind:

```css
:root {
  /* Cores — use escala semântica, não literal */
  --color-brand-primary: #0066FF;
  --color-brand-secondary: #00D4AA;
  --color-surface-default: #0A0A0F;
  --color-surface-raised: #13131A;
  --color-text-primary: #F0F0F5;
  --color-text-muted: #6B6B80;
  --color-border-subtle: rgba(255,255,255,0.08);
  --color-danger: #FF4D4D;
  --color-success: #00C48C;

  /* Tipografia */
  --font-display: 'Syne', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Escala de espaçamento (base 4px) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Raios */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-full: 9999px;

  /* Sombras */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.4);
  --shadow-glow: 0 0 24px rgba(0,102,255,0.25);

  /* Transições */
  --transition-fast: 150ms ease;
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 3. Padrões de Componentes

### 3.1 Anatomia de um Componente React Profissional

```tsx
// ✅ Padrão Antigravity
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-brand-primary)] text-white hover:bg-blue-500 shadow-[var(--shadow-glow)]',
  secondary: 'bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] hover:border-[var(--color-brand-primary)]',
  ghost: 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]',
  danger: 'bg-[var(--color-danger)] text-white hover:opacity-90',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-[var(--radius-md)]',
          'transition-all duration-[var(--transition-base)] focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] focus-visible:ring-offset-2',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {isLoading ? <Spinner size={size} /> : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    )
  }
)
Button.displayName = 'Button'
```

### 3.2 Padrão de Form com Validação

```tsx
// Use React Hook Form + Zod sempre
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

type FormData = z.infer<typeof schema>

function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  // ...
}
```

---

## 4. Acessibilidade (a11y) — Obrigatório

**Todo componente DEVE seguir estas regras:**

```
✅ Checkist de Acessibilidade Antigravity
□ Ratio de contraste mínimo 4.5:1 (texto normal) / 3:1 (texto grande)
□ Todos os elementos interativos têm aria-label ou texto visível
□ Navegação por teclado funciona (Tab, Enter, Esc, setas)
□ Estados de foco visíveis com outline personalizado
□ Imagens têm alt text descritivo (ou alt="" se decorativas)
□ Formulários têm <label> associado a cada <input>
□ Erros de formulário anunciados via aria-describedby
□ Modais/Dialogs trapeiam foco (focus trap)
□ Animações respeitam prefers-reduced-motion
□ Hierarquia de headings correta (h1 → h2 → h3)
□ Botões de ícone têm aria-label
□ Role ARIA correto para componentes customizados
```

```css
/* SEMPRE incluir em globals.css */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus visível customizado */
:focus-visible {
  outline: 2px solid var(--color-brand-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

---

## 5. Performance Web

### 5.1 Métricas Core Web Vitals (metas Antigravity)
| Métrica | Meta | Crítico |
|---------|------|---------|
| LCP | < 2.5s | > 4s |
| FID/INP | < 100ms | > 300ms |
| CLS | < 0.1 | > 0.25 |
| TTFB | < 800ms | > 1800ms |

### 5.2 Otimizações Obrigatórias

```tsx
// Lazy loading de rotas
const Dashboard = lazy(() => import('./pages/Dashboard'))

// Otimização de imagens Next.js
import Image from 'next/image'
<Image src="/hero.jpg" width={1200} height={630} priority alt="..." />

// Memoização estratégica (apenas quando necessário)
const ExpensiveList = memo(({ items }: { items: Item[] }) => (
  <ul>{items.map(item => <ListItem key={item.id} {...item} />)}</ul>
))

// Virtualização para listas grandes (>50 itens)
import { useVirtualizer } from '@tanstack/react-virtual'
```

### 5.3 Bundle Size
```bash
# Analise sempre antes de PR
npx @next/bundle-analyzer
# ou
npx vite-bundle-visualizer
```

---

## 6. Responsividade

**Mobile-first sempre:**

```css
/* ✅ Correto: mobile-first */
.card {
  padding: var(--space-4);
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .card {
    padding: var(--space-8);
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1280px) {
  .card { grid-template-columns: repeat(3, 1fr); }
}
```

**Breakpoints Antigravity:**
- `sm`: 640px — smartphones landscape
- `md`: 768px — tablets
- `lg`: 1024px — laptops
- `xl`: 1280px — desktops
- `2xl`: 1536px — telas grandes

---

## 7. Animações & Micro-interações

```css
/* Entrada de elementos */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.card-enter {
  animation: fadeInUp var(--transition-slow) both;
}

/* Stagger para listas */
.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 60ms; }
.list-item:nth-child(3) { animation-delay: 120ms; }
```

```tsx
// Framer Motion para animações complexas
import { motion, AnimatePresence } from 'framer-motion'

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}
```

---

## 8. Testes de Componente

```tsx
// Padrão com Testing Library
import { render, screen, userEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renderiza com texto correto', () => {
    render(<Button>Salvar</Button>)
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
  })

  it('desabilita durante loading', () => {
    render(<Button isLoading>Salvar</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('chama onClick ao clicar', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Clique</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

---

## 9. Anti-padrões — NUNCA Fazer

```
❌ Usar cor hardcoded (#fff) em vez de variável CSS
❌ Deixar imagens sem atributo alt
❌ Usar <div> clicável em vez de <button>
❌ Z-index acima de 100 sem documentar
❌ any no TypeScript sem comentário justificando
❌ useEffect para derivar estado (use useMemo)
❌ Key={index} em listas dinâmicas
❌ Importar biblioteca inteira (import _ from 'lodash')
❌ Inline styles repetitivas (use classes)
❌ console.log em produção
❌ Componente com mais de 300 linhas sem refatorar
```

---

## 10. Checklist Final Antes de Entregar

```
□ TypeScript sem erros (tsc --noEmit)
□ ESLint sem warnings
□ Acessibilidade verificada (axe DevTools)
□ Testado em mobile (320px mínimo)
□ Dark mode funciona (se aplicável)
□ Loading states implementados
□ Empty states implementados
□ Error states implementados
□ Animações respeitam prefers-reduced-motion
□ Sem console.log ou código comentado
□ Storybook story criada (se projeto usa)
```

---

> 📚 Para referências detalhadas, consulte:
> - `references/design-tokens.md` — Catálogo completo de tokens
> - `references/components-patterns.md` — Padrões avançados de componentes
> - `references/a11y-guide.md` — Guia completo de acessibilidade
