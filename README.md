# FerreiraDash
# Ferreira & Rocha - Gestão Financeira Interna ⚖️💼

Uma aplicação web mobile-first desenvolvida exclusivamente para o controle financeiro interno do escritório **Ferreira & Rocha**. O sistema centraliza o fluxo de caixa da firma, gerenciando com precisão as entradas de honorários, despesas operacionais e o fluxo de repasse de valores a clientes.

O projeto foi desenhado com foco em usabilidade ágil para dispositivos móveis, permitindo que lançamentos de despesas e consultas sejam feitos em tempo real diretamente pelo celular.

🌐 **Link da Aplicação:** [https://ferreiradash.onrender.com](https://ferreiradash.onrender.com)

---

## 🚀 Funcionalidades Principais

### 1. Gestão de Entradas (Recebimentos)
 Honorários Contratuais: Registro de receitas fixas ou parceladas dos clientes.
  Honorários de Sucumbência: Controle de valores recebidos da parte perdedora em processos.
  Alvarás Judiciais: Entrada do montante total liberado por decisões judiciais antes da divisão de valores.

 2. Controle de Saídas (Despesas)
Gastos com Audiências: Lançamento de custas processuais, contratação de advogados correspondentes, deslocamentos e cópias.
Manutenção Operacional: Gerenciamento de custos com assinaturas de sistemas jurídicos, tokens, certificados digitais e infraestrutura.
Corpo Técnico: Registro de pró-labore, salários de colaboradores (secretárias, estagiários) e comissões por êxito.

 3. Módulo de Repasse Automatizado
Fluxo onde o usuário insere o valor total recebido de uma causa ganha e a porcentagem do escritório (ex: 30%). O sistema calcula a fração exata do cliente (70%), gerando simultaneamente o lançamento de saída (Repasse ao Cliente) e a receita real do escritório (Honorários).

---

 🔒 Segurança e Arquitetura

A segurança dos dados financeiros e das informações dos processos é garantida através de boas práticas de desenvolvimento:
 Proteção contra SQL/NoSQL Injection:** Utilização de queries parametrizadas via Prisma ORM, garantindo que nenhum input do usuário seja executado como código no banco de dados.
  Criptografia em Trânsito: Todo o tráfego de dados entre o celular do usuário e o servidor é protegido via protocolo HTTPS/SSL nativo da Render.
  Variáveis de Ambiente Protegidas: Chaves de API e credenciais do banco de dados ficam estritamente isoladas no servidor, longe do repositório público.

---

## 🛠️ Tecnologias Utilizadas

Frontend & Backend: Next.js / Node.js
ORM / Conector: Prisma ORM
Banco de Dados & Auth: Supabase (PostgreSQL)
Hospedagem da Aplicação: Render (Web Service)



