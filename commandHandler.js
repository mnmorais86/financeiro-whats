const {
  addDebt,
  markPaid,
  undoPaid,
  deleteDebt,
  editDebt,
  buildListMessage,
  buildSummaryMessage,
  parseAmount,
  parseBrazilDate,
  formatBRL,
  formatDateBR,
  monthRefLabel,
  parseMonthInput
} = require('./debtService');

function helpText() {
  return [
    '🤖 Comandos disponíveis:',
    '',
    '1) adicionar dívida',
    'add 350 internet 10/04/2026',
    'add 500 aluguel',
    '',
    '2) listar dívidas',
    'listar',
    'listar 04/2026',
    '',
    '3) resumo do mês',
    'resumo',
    'resumo 04/2026',
    '',
    '4) marcar como pago',
    'pagar 3',
    'pagar 3 150',
    '',
    '5) desfazer pagamento',
    'desfazer 3',
    '',
    '6) editar',
    'editar 3 valor 650',
    'editar 3 descricao cartao nubank',
    'editar 3 vencimento 15/04/2026',
    '',
    '7) apagar',
    'apagar 3'
  ].join('\n');
}

async function handleCommand(text, phone) {
  const input = (text || '').trim();
  const lower = input.toLowerCase();

  if (!input) return 'Envie um comando. Digite *ajuda* para ver as opções.';
  if (['ajuda', 'help', 'menu'].includes(lower)) return helpText();

  if (lower.startsWith('add ')) {
    const raw = input.slice(4).trim();
    const parts = raw.split(/\s+/);
    const amount = parseAmount(parts[0]);
    if (amount == null) {
      return '❌ Valor inválido. Exemplo: add 350 internet 10/04/2026';
    }

    let dueDate = null;
    const maybeDate = parts[parts.length - 1];
    if (parseBrazilDate(maybeDate)) {
      dueDate = maybeDate;
      parts.pop();
    }

    parts.shift();
    const description = parts.join(' ').trim();
    if (!description) {
      return '❌ Falta a descrição. Exemplo: add 350 internet 10/04/2026';
    }

    const created = await addDebt({ description, amount, dueDate, phone });
    return [
      '✅ Dívida adicionada com sucesso.',
      `ID: #${created.id}`,
      `Descrição: ${created.description}`,
      `Valor: ${formatBRL(created.amount)}`,
      `Vencimento: ${created.dueDate ? formatDateBR(created.dueDate) : '-'}`,
      `Mês: ${monthRefLabel(created.monthRef)}`
    ].join('\n');
  }

  if (lower === 'listar' || lower.startsWith('listar ')) {
    const month = input.split(/\s+/).slice(1).join(' ').trim();
    return buildListMessage(month);
  }

  if (lower === 'resumo' || lower.startsWith('resumo ')) {
    const month = input.split(/\s+/).slice(1).join(' ').trim();
    return buildSummaryMessage(month);
  }

  if (lower.startsWith('pagar ')) {
    const parts = input.split(/\s+/);
    const id = Number(parts[1]);
    const paidAmount = parts[2] ? parseAmount(parts[2]) : null;
    if (!id) return '❌ Informe o ID. Exemplo: pagar 3';
    const updated = await markPaid(id, paidAmount, phone);
    if (!updated) return '❌ Dívida não encontrada.';
    return `✅ Dívida #${id} atualizada para *${updated.status}*. Pago: ${formatBRL(updated.paid_amount)}.`;
  }

  if (lower.startsWith('desfazer ')) {
    const parts = input.split(/\s+/);
    const id = Number(parts[1]);
    if (!id) return '❌ Informe o ID. Exemplo: desfazer 3';
    const updated = await undoPaid(id, phone);
    if (!updated) return '❌ Dívida não encontrada.';
    return `↩️ Pagamento da dívida #${id} foi desfeito. Status: pendente.`;
  }

  if (lower.startsWith('apagar ')) {
    const parts = input.split(/\s+/);
    const id = Number(parts[1]);
    if (!id) return '❌ Informe o ID. Exemplo: apagar 3';
    const deleted = await deleteDebt(id, phone);
    if (!deleted) return '❌ Dívida não encontrada.';
    return `🗑️ Dívida #${id} apagada com sucesso.`;
  }

  if (lower.startsWith('editar ')) {
    const parts = input.split(/\s+/);
    const id = Number(parts[1]);
    const field = (parts[2] || '').toLowerCase();
    const value = parts.slice(3).join(' ').trim();
    if (!id || !field || !value) {
      return '❌ Exemplo: editar 3 valor 650';
    }
    const updated = await editDebt(id, field, value, phone);
    if (!updated) return '❌ Dívida não encontrada.';
    return [
      `✏️ Dívida #${id} atualizada.`,
      `Descrição: ${updated.description}`,
      `Valor: ${formatBRL(updated.amount)}`,
      `Vencimento: ${formatDateBR(updated.due_date)}`,
      `Status: ${updated.status}`
    ].join('\n');
  }

  if (lower === 'pendentes') {
    return buildListMessage(parseMonthInput());
  }

  return 'Não entendi o comando. Digite *ajuda* para ver os comandos disponíveis.';
}

module.exports = { handleCommand, helpText };
