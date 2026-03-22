---
name: Supabase Operations
description: Guia para manipulação de dados, segurança RLS e integração com o banco de dados Supabase.
---

# Skill: Supabase Operations

Instruções para garantir integridade e segurança em todas as operações de banco de dados.

## 🔑 Cliente Supabase
- Utilize sempre o cliente exportado em `../supabaseClient.ts`.
- Certifique-se de que a instância do Supabase está corretamente inicializada com as variáveis de ambiente.

## 🛡️ Segurança e RLS
- **Filtro de Usuário**: Toda query `SELECT`, `UPDATE` ou `DELETE` deve incluir `.eq('user_id', user.id)` para respeitar as políticas de segurança.
- **Payloads**: Sempre valide os dados antes de enviar para o `.insert()` ou `.update()`.

## 📊 Estrutura de Tabelas Comuns
- `credit_cards`: Gerencia limites, cores, bandeiras e fechamento.
- `transactions`: Fluxo de caixa, despesas vinculadas a cartões e status de pagamento.

## ⚠️ Tratamento de Erros
- Sempre use blocos `try/catch`.
- Se uma operação falhar, exiba uma notificação amigável ao usuário e registre o erro no console para debug.
