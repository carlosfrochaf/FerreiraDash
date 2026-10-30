# Arquitetura — Ferreira & Rocha Financeiro

## Visão geral

SaaS privado interno para controle financeiro de escritório de advocacia.

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| UI | Componentes estilo Shadcn/ui (Radix + CVA) |
| Backend | API Routes do Next.js (Server Actions ready) |
| ORM | Prisma 6 |
| Banco | PostgreSQL 16 |
| Gráficos | Recharts |
| Validação | Zod |

## Estrutura de pastas

```
src/
├── app/                    # Rotas e páginas
│   ├── page.tsx            # Dashboard
│   ├── lancamentos/novo/   # Formulário de lançamento
│   ├── repasse/            # Módulo de repasse jurídico
│   └── api/                # REST interno
├── components/
│   ├── ui/                 # Primitivos (Button, Card, Input...)
│   ├── layout/             # AppShell, navegação mobile
│   ├── dashboard/          # Cards, gráfico, listas
│   └── forms/              # LancamentoForm, RepasseForm
├── lib/
│   ├── prisma.ts           # Cliente singleton
│   ├── finance.ts          # Regras de negócio e dashboard
│   ├── repasse-calculator.ts
│   ├── validations.ts
│   └── upload.ts
└── types/
```

## Modelo de dados (ER simplificado)

```mermaid
erDiagram
    CONTATO ||--o{ PROCESSO : possui
    CONTATO ||--o{ TRANSACAO : referencia
    PROCESSO ||--o{ TRANSACAO : vincula
    PROCESSO ||--o{ REPASSE : origina
    REPASSE ||--o{ TRANSACAO : gera

    CONTATO {
        string id PK
        string nome
        enum tipo
        string pix_chave
    }

    PROCESSO {
        string id PK
        string numero_pje UK
        string nome_acao
        string cliente_id FK
    }

    TRANSACAO {
        string id PK
        enum tipo
        enum categoria
        decimal valor
        date data_competencia
        enum status
        string processo_id FK
        string repasse_id FK
    }

    REPASSE {
        string id PK
        decimal valor_total_recebido
        decimal percentual_escritorio
        decimal valor_escritorio
        decimal valor_cliente
    }
```

## Fluxo do módulo de repasse

1. Usuário informa valor total do alvará e % do escritório (ex: 30%).
2. Sistema calcula honorários e repasse ao cliente.
3. Em uma transação atômica (`prisma.$transaction`):
   - Cria registro em `repasses`
   - **Entrada** `ALVARA_CAUSA_GANHA` (valor total, pago)
   - **Entrada** `HONORARIOS_ESCRITORIO` (parte do escritório, pago)
   - **Saída** `REPASSE_CLIENTE` (parte do cliente, **pendente**)

## Categorias por tipo

| Entrada | Saída |
|---------|-------|
| Honorários Contratuais | Audiência |
| Honorários Sucumbência | Repasse ao Cliente |
| Alvará / Causa Ganha | Advogado / Colaborador |
| Honorários Escritório* | Custo Operacional |
| | Salário |

\* Gerado automaticamente no repasse.

## Despesas

- **Formulário simples**: saídas de Custo Operacional e Salário (slugs `CUSTO_OPERACIONAL`, `SALARIO`) não pedem causa nem cliente; o nome do custo/funcionário fica em `descricao`.
- **Recorrentes** (`despesas_recorrentes`): guardam nome, valor, dia do vencimento e o último mês já lançado. `gerarDespesasRecorrentes()` (`src/lib/despesas-recorrentes.ts`) lança os meses que faltam como pendentes; roda no disparo das 8h (`/api/push/send-notifications?turno=manha`) e ao abrir `/despesas`. A regra dos meses é pura, em `src/lib/recorrencias.ts`.
- **Tela `/despesas`**: total, pago e falta pagar do mês, separados em advogados (audiências, petições, Advogado/Colaborador), salários, custos operacionais e outras saídas. Repasses ao cliente não contam como despesa. Agrupamento em `src/lib/despesas.ts`.

## Próximos passos sugeridos

1. Autenticação interna (NextAuth ou Clerk com allowlist de e-mails)
2. CRUD de Contatos e Processos
3. Storage em S3/Cloudflare R2 para anexos em produção
4. Relatórios PDF e exportação Excel
5. Notificações de repasses pendentes
