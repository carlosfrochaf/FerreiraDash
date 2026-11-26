// Campos da ficha (rótulos iguais aos da ficha antiga). Usado pela tela e pelo Word.
import { OPCOES_FICHA } from "./ficha";

export type Tipo = "texto" | "data" | "hora" | "longo" | "simnao" | { opcoes: readonly string[] };
export type Campo = { k: string; rotulo: string; tipo?: Tipo; largo?: boolean };
export type Bloco = "empresa" | "contrato" | "jornada" | "ambiente" | "verbas" | "outras";
export type Valor = string | boolean | null | undefined | string[];

const O = OPCOES_FICHA;

export const CAMPOS_CLIENTE: Campo[] = [
  { k: "nome", rotulo: "Nome completo", largo: true },
  { k: "cpf", rotulo: "CPF" },
  { k: "dataNascimento", rotulo: "Data de nascimento", tipo: "data" },
  { k: "telefone", rotulo: "Telefone" },
  { k: "email", rotulo: "E-mail" },
  { k: "estadoCivil", rotulo: "Estado civil", tipo: { opcoes: O.estadoCivil } },
  { k: "endereco", rotulo: "Endereço completo", largo: true },
  { k: "cep", rotulo: "CEP" },
  { k: "cidadeUf", rotulo: "Cidade/UF" },
  { k: "origem", rotulo: "Como chegou ao escritório", tipo: { opcoes: O.origem } },
];

export const BLOCOS: { b: Bloco; titulo: string; campos: Campo[] }[] = [
  {
    b: "empresa",
    titulo: "Dados da empresa (reclamada)",
    campos: [
      { k: "cnpj", rotulo: "CNPJ" },
      { k: "nomeFantasia", rotulo: "Nome fantasia" },
      { k: "email", rotulo: "E-mail da empresa" },
      { k: "telefones", rotulo: "Telefone(s)" },
      { k: "endereco", rotulo: "Endereço da sede", largo: true },
      { k: "localTrabalho", rotulo: "Local de trabalho (se diferente da sede)", largo: true },
    ],
  },
  {
    b: "contrato",
    titulo: "Contrato de trabalho",
    campos: [
      { k: "admissao", rotulo: "Data de admissão", tipo: "data" },
      { k: "demissao", rotulo: "Data de demissão", tipo: "data" },
      { k: "funcaoInicial", rotulo: "Função inicial" },
      { k: "funcaoFinal", rotulo: "Função final/outra" },
      { k: "salarioInicial", rotulo: "Salário inicial (R$)" },
      { k: "ultimoSalario", rotulo: "Último salário (R$)" },
      { k: "formaContratacao", rotulo: "Forma de contratação", tipo: { opcoes: O.formaContratacao } },
      { k: "motivoDesligamento", rotulo: "Motivo do desligamento", tipo: { opcoes: O.motivoDesligamento } },
      { k: "registroCtps", rotulo: "Registro em CTPS?", tipo: "simnao" },
      { k: "avisoPrevio", rotulo: "Aviso prévio", tipo: { opcoes: O.avisoPrevio } },
      { k: "dataAvisoPrevio", rotulo: "Data do aviso prévio", tipo: "data" },
      { k: "mudancaFuncao", rotulo: "Mudança de função?", tipo: "simnao" },
      { k: "quandoMudou", rotulo: "Quando ocorreu?" },
      { k: "comissoes", rotulo: "Comissões/gratificações?", tipo: "simnao" },
      { k: "valorMedioComissoes", rotulo: "Valor médio mensal (R$)" },
    ],
  },
  {
    b: "jornada",
    titulo: "Jornada de trabalho",
    campos: [
      { k: "entrada", rotulo: "Horário de entrada", tipo: "hora" },
      { k: "saida", rotulo: "Horário de saída", tipo: "hora" },
      { k: "intervalo", rotulo: "Intervalo" },
      { k: "escala", rotulo: "Escala" },
      { k: "horasExtras", rotulo: "Fazia horas extras?", tipo: "simnao" },
      { k: "horasExtrasPagas", rotulo: "Eram pagas?", tipo: { opcoes: O.horasExtrasPagas } },
      { k: "controlePonto", rotulo: "Controle de ponto?", tipo: { opcoes: O.controlePonto } },
      { k: "trabalhoNoturno", rotulo: "Trabalho noturno?", tipo: "simnao" },
      { k: "adicionalNoturno", rotulo: "Adicional noturno?", tipo: "simnao" },
    ],
  },
  {
    b: "ambiente",
    titulo: "Ambiente e condições de trabalho",
    campos: [
      { k: "epis", rotulo: "Fornecimento de EPIs", tipo: { opcoes: O.epis } },
      { k: "insalubridade", rotulo: "Insalubridade?", tipo: "simnao" },
      { k: "periculosidade", rotulo: "Periculosidade?", tipo: "simnao" },
      { k: "recebiaAdicionais", rotulo: "Recebia adicionais?", tipo: "simnao" },
      { k: "acidente", rotulo: "Acidente de trabalho?", tipo: "simnao" },
      { k: "assedio", rotulo: "Assédio (moral/sexual)?", tipo: "simnao" },
    ],
  },
  {
    b: "verbas",
    titulo: "Verbas rescisórias",
    campos: [
      { k: "recebeu", rotulo: "Recebeu as verbas rescisórias?", tipo: { opcoes: O.verbasRecebidas } },
      { k: "valorPago", rotulo: "Valor pago (R$)" },
      { k: "dataPagamento", rotulo: "Data pagamento", tipo: "data" },
      { k: "recebeuTrct", rotulo: "Recebeu TRCT?", tipo: "simnao" },
      { k: "seguroDesemprego", rotulo: "Seguro-desemprego?", tipo: "simnao" },
      { k: "parcelasSeguro", rotulo: "Nº parcelas" },
      { k: "sacouFgts", rotulo: "Conseguiu sacar FGTS?", tipo: "simnao" },
    ],
  },
  {
    b: "outras",
    titulo: "Testemunhas e outras informações",
    campos: [
      { k: "testemunhas", rotulo: "Possui testemunhas?", tipo: "simnao" },
      { k: "quantasTestemunhas", rotulo: "Quantas?" },
      { k: "acaoAnterior", rotulo: "Já moveu ação anterior?", tipo: "simnao" },
      { k: "outrasAcoes", rotulo: "Outras ações contra a empresa?", tipo: "simnao" },
      { k: "observacoes", rotulo: "Observações adicionais", tipo: "longo", largo: true },
    ],
  },
];

