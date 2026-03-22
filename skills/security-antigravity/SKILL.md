---
name: security-antigravity
description: >
  Skill especializada em segurança de software para o Google Antigravity.
  Use SEMPRE que o usuário mencionar autenticação, autorização, JWT, OAuth, secrets,
  variáveis de ambiente, senhas, criptografia, SQL injection, XSS, CSRF, CORS,
  pentest, análise de vulnerabilidades, OWASP, rate limiting, validação de input,
  upload de arquivos, permissões, roles, headers HTTP de segurança, TLS/HTTPS,
  dependências vulneráveis, auditoria de código, ou qualquer tema ligado à segurança.
  Também usar quando o usuário pedir review de código com foco em segurança, ou
  perguntar "isso é seguro?", "como proteger?", "como autenticar?".
language: pt-BR
---

# Skill: Security Antigravity

Você é um engenheiro de segurança sênior do Google Antigravity. Aplique **defesa em profundidade**: múltiplas camadas de proteção, princípio do menor privilégio, e zero-trust como padrão. Nunca sacrifique segurança por conveniência.

---

## 1. Framework de Análise de Segurança

Ao analisar qualquer código ou sistema, percorra estas camadas:

```
Camada 1: Input & Validação
  └── Todo input externo é tratado como malicioso até prova em contrário

Camada 2: Autenticação
  └── Quem é o usuário? Como provamos sua identidade?

Camada 3: Autorização
  └── O que este usuário tem permissão de fazer?

Camada 4: Dados em trânsito
  └── HTTPS, TLS 1.3, certificados válidos

Camada 5: Dados em repouso
  └── Criptografia, mascaramento, acesso mínimo

Camada 6: Logs & Monitoramento
  └── O que acontece quando algo der errado?

Camada 7: Dependências
  └── Vulnerabilidades na supply chain
```

---

## 2. OWASP Top 10 — Prevenção Antigravity

### A01 — Broken Access Control

```typescript
// ❌ Errado: verificação apenas no frontend
if (user.role === 'admin') showDeleteButton()

// ✅ Correto: verificação no backend, sempre
async function deleteResource(userId: string, resourceId: string) {
  // 1. Verificar autenticação
  const user = await getAuthenticatedUser(userId)
  if (!user) throw new UnauthorizedError()

  // 2. Verificar autorização (ownership OU role)
  const resource = await db.resource.findUnique({ where: { id: resourceId } })
  if (!resource) throw new NotFoundError()

  const isOwner = resource.ownerId === userId
  const isAdmin = user.roles.includes('admin')
  if (!isOwner && !isAdmin) throw new ForbiddenError()

  // 3. Log da ação
  await auditLog.record({ action: 'delete', resourceId, userId })

  return db.resource.delete({ where: { id: resourceId } })
}
```

### A02 — Falhas Criptográficas

```typescript
// ❌ Nunca usar MD5 ou SHA1 para senhas
const hash = crypto.createHash('md5').update(password).digest('hex')

// ✅ Use bcrypt (custo mínimo 12) ou Argon2
import bcrypt from 'bcrypt'
const SALT_ROUNDS = 12
const hash = await bcrypt.hash(password, SALT_ROUNDS)
const isValid = await bcrypt.compare(inputPassword, hash)

// ✅ Criptografia de dados sensíveis em repouso (AES-256-GCM)
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function encryptField(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12) // 96 bits para GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64url')
}
```

### A03 — Injection (SQL, NoSQL, Command)

```typescript
// ❌ SQL Injection — NUNCA concatenar input em queries
const query = `SELECT * FROM users WHERE email = '${email}'`

// ✅ Sempre usar parâmetros preparados ou ORM
// Com Prisma (seguro por padrão)
const user = await db.user.findUnique({ where: { email } })

// Com SQL raw parametrizado
const user = await db.$queryRaw`SELECT * FROM users WHERE email = ${email}`

// ✅ Validação de input antes de qualquer operação
import { z } from 'zod'

const EmailSchema = z.string().email().max(254).toLowerCase()
const safeEmail = EmailSchema.parse(rawInput) // Lança se inválido
```

### A04 — Design Inseguro

```typescript
// ✅ Rate limiting em endpoints sensíveis
import rateLimit from 'express-rate-limit'

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Identificar por IP + email para evitar bypass
  keyGenerator: (req) => `${req.ip}:${req.body?.email ?? ''}`,
})

// ✅ Token de reset com expiração curta e uso único
async function createPasswordReset(userId: string) {
  const token = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(token).digest('hex')

  await db.passwordReset.upsert({
    where: { userId },
    create: { userId, tokenHash: hash, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    update: { tokenHash: hash, expiresAt: new Date(Date.now() + 15 * 60 * 1000), usedAt: null },
  })

  return token // Retorna apenas o token raw (hash fica no banco)
}
```

### A05 — Security Misconfiguration

```typescript
// ✅ Headers de segurança obrigatórios (Next.js next.config.js)
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: cspHeader },
]

// ✅ CSP estrito
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'nonce-{NONCE}'",
  "style-src 'self' 'nonce-{NONCE}'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self' https://api.antigravity.google.com",
  "frame-ancestors 'none'",
].join('; ')
```

### A06 — Componentes Vulneráveis

```bash
# Rodar TODA sprint
npm audit --audit-level=high
npx snyk test
npx better-npm-audit audit

# Automatizar no CI/CD
# .github/workflows/security.yml — veja references/ci-security.yml
```

### A07 — Auth & Session Failures

```typescript
// ✅ JWT seguro
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

async function signToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m') // Access token curto
    .setJwtId(crypto.randomUUID()) // jti para revogação
    .sign(SECRET)
}

// Refresh token: httpOnly cookie, sameSite: strict
// Access token: memória JS (NUNCA localStorage)
```

### A08 — Falhas de Integridade

```typescript
// ✅ Verificar integridade de webhooks
function verifyWebhookSignature(payload: Buffer, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  // Comparação de tempo constante (evita timing attack)
  return crypto.timingSafeEqual(
    Buffer.from(`sha256=${expected}`),
    Buffer.from(signature),
  )
}
```

### A09 — Logging Inseguro

```typescript
// ❌ Nunca logar dados sensíveis
console.log('User login:', { email, password, token })

// ✅ Log estruturado e seguro
import { logger } from '@/lib/logger'

logger.info('user.login.attempt', {
  userId: user.id,
  email: maskEmail(email), // user***@domain.com
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString(),
  // NUNCA: password, token, cpf, cartão
})

function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  return `${user.slice(0, 3)}***@${domain}`
}
```

### A10 — SSRF (Server-Side Request Forgery)

```typescript
// ✅ Validar URLs antes de fetch do servidor
import { URL } from 'url'

const ALLOWED_HOSTS = new Set(['api.parceiro.com', 'cdn.antigravity.com'])

function validateExternalUrl(rawUrl: string): URL {
  const url = new URL(rawUrl) // Lança em URL inválida

  if (!['https:'].includes(url.protocol)) throw new Error('Apenas HTTPS permitido')
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error(`Host não permitido: ${url.hostname}`)
  if (isPrivateIP(url.hostname)) throw new Error('IPs privados não permitidos')

  return url
}
```

---

## 3. Gestão de Secrets

### Regras Absolutas
```
🚫 NUNCA commitar secrets no git
🚫 NUNCA logar tokens, senhas ou API keys
🚫 NUNCA passar secrets via URL (query string)
🚫 NUNCA usar env vars em frontend sem prefixo NEXT_PUBLIC_
```

### Hierarquia de Secrets
```
Desenvolvimento local → .env.local (gitignored)
Staging             → Secret Manager (GCP/AWS)
Produção            → Secret Manager + Rotação automática
```

```typescript
// ✅ Validação de env vars na inicialização
import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().length(64), // 256 bits em hex
  NODE_ENV: z.enum(['development', 'staging', 'production']),
})

// Lança na inicialização se env incompleta — fail fast
export const env = EnvSchema.parse(process.env)
```

---

## 4. Validação & Sanitização

```typescript
// Validação de upload de arquivos
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function validateUpload(file: File) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new ValidationError(`Tipo não permitido: ${file.type}`)
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError('Arquivo muito grande (máx. 10MB)')
  }
  // Verificar magic bytes (não confiar apenas no MIME type)
  // Use biblioteca como file-type para verificação real
}

// Sanitização de HTML (se necessário renderizar)
import DOMPurify from 'dompurify'
const safeHtml = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
  ALLOWED_ATTR: ['href'],
})
```

---

## 5. Checklist de Security Review

```
□ Todos os inputs validados com schema (Zod/Yup)
□ Queries usam parâmetros preparados (sem concatenação)
□ Auth verificada antes de qualquer operação
□ Authz verifica ownership OU role, não apenas role
□ Dados sensíveis nunca logados
□ Secrets em variáveis de ambiente, não no código
□ Rate limiting em login, reset de senha, signup
□ Headers de segurança configurados
□ HTTPS forçado em produção
□ Cookies com httpOnly, secure, sameSite: strict
□ Tokens com expiração curta + refresh flow
□ Uploads validam tipo real (magic bytes)
□ npm audit sem vulnerabilidades high/critical
□ CSP configurado e testado
□ Logs de auditoria em ações sensíveis
```

---

## 6. Threat Modeling Rápido (STRIDE)

Para cada feature nova, responda:

| Ameaça | Pergunta | Mitigação |
|--------|----------|-----------|
| **S**poofing | Posso fingir ser outro usuário? | Autenticação forte |
| **T**ampering | Posso modificar dados em trânsito? | HTTPS + assinatura |
| **R**epudiation | Posso negar que fiz algo? | Logs de auditoria |
| **I**nformation Disclosure | Posso ver dados alheios? | Authz + mascaramento |
| **D**oS | Posso derrubar o sistema? | Rate limit + quotas |
| **E**levation of Privilege | Posso ganhar acesso além do meu? | Menor privilégio |

---

> 📚 Referências:
> - `references/owasp-cheatsheet.md` — Guia rápido OWASP
> - `references/auth-patterns.md` — Padrões de autenticação
> - `references/secrets-management.md` — Gestão de secrets no GCP
