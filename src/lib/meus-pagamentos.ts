// Resumo do que o advogado já recebeu e ainda vai receber. Puro.

export function resumoPagamentos(itens: { valor: number | null; pago: boolean }[]): { recebido: number; aReceber: number; semValor: number } {
  let recebido = 0;
  let aReceber = 0;
  let semValor = 0;
  for (const i of itens) {
    if (i.valor === null) semValor++;
    else if (i.pago) recebido += i.valor;
    else aReceber += i.valor;
  }
  return { recebido, aReceber, semValor };
}
