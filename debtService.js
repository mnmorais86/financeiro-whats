const db = require('./db');
const {
  nowISO,
  parseBrazilDate,
  monthRefFromDate,
  formatBRL,
  formatDateBR,
  parseAmount,
  parseMonthInput,
  monthRefLabel
} = require('./utils');

function logAction(action, details, phone) {
  db.run(
    `INSERT INTO logs (action, details, phone, created_at) VALUES (?, ?, ?, ?)`,
    [action, details, phone || '', nowISO()]
  );
}

function addDebt({ description, amount, dueDate, phone }) {
  return new Promise((resolve, reject) => {
    const now = nowISO();
    const parsedDueDate = parseBrazilDate(dueDate);
    const monthRef = monthRefFromDate(parsedDueDate || dueDate);

    db.run(
      `INSERT INTO debts (description, amount, due_date, month_ref, status, paid_amount, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pendente', 0, ?, ?, ?, ?)`,
      [description, amount, parsedDueDate, monthRef, phone, phone, now, now],
      function (err) {
        if (err) return reject(err);
        logAction('ADD_DEBT', `${description} | ${amount}`, phone);
        resolve({ id: this.lastID, description, amount, dueDate: parsedDueDate, monthRef });
      }
    );
  });
}

function listDebts(monthInput) {
  return new Promise((resolve, reject) => {
    const monthRef = parseMonthInput(monthInput);
    db.all(
      `SELECT * FROM debts WHERE month_ref = ? ORDER BY status ASC, COALESCE(due_date, '9999-12-31') ASC, id DESC`,
      [monthRef],
      (err, rows) => {
        if (err) return reject(err);
        resolve({ monthRef, rows });
      }
    );
  });
}

function getSummary(monthInput) {
  return new Promise((resolve, reject) => {
    const monthRef = parseMonthInput(monthInput);
    db.all(
      `SELECT * FROM debts WHERE month_ref = ?`,
      [monthRef],
      (err, rows) => {
        if (err) return reject(err);
        const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
        const paid = rows.reduce((s, r) => s + Number(r.paid_amount || 0), 0);
        const pending = total - paid;
        resolve({ monthRef, total, paid, pending, count: rows.length, rows });
      }
    );
  });
}

function markPaid(id, paidAmount, phone) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM debts WHERE id = ?`, [id], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      const finalPaid = paidAmount == null ? Number(row.amount) : Number(paidAmount);
      const status = finalPaid >= Number(row.amount) ? 'pago' : 'parcial';
      db.run(
        `UPDATE debts SET paid_amount = ?, status = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
        [finalPaid, status, phone, nowISO(), id],
        function (err2) {
          if (err2) return reject(err2);
          logAction('MARK_PAID', `ID ${id} | ${finalPaid}`, phone);
          resolve({ ...row, paid_amount: finalPaid, status });
        }
      );
    });
  });
}

function undoPaid(id, phone) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM debts WHERE id = ?`, [id], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      db.run(
        `UPDATE debts SET paid_amount = 0, status = 'pendente', updated_by = ?, updated_at = ? WHERE id = ?`,
        [phone, nowISO(), id],
        function (err2) {
          if (err2) return reject(err2);
          logAction('UNDO_PAID', `ID ${id}`, phone);
          resolve({ ...row, paid_amount: 0, status: 'pendente' });
        }
      );
    });
  });
}

function deleteDebt(id, phone) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM debts WHERE id = ?`, [id], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      db.run(`DELETE FROM debts WHERE id = ?`, [id], function (err2) {
        if (err2) return reject(err2);
        logAction('DELETE_DEBT', `ID ${id}`, phone);
        resolve(row);
      });
    });
  });
}

function editDebt(id, field, value, phone) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM debts WHERE id = ?`, [id], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);

      let sql = '';
      let params = [];
      const now = nowISO();

      if (field === 'valor') {
        const amount = parseAmount(value);
        if (amount == null) return reject(new Error('Valor inválido.'));
        sql = `UPDATE debts SET amount = ?, updated_by = ?, updated_at = ? WHERE id = ?`;
        params = [amount, phone, now, id];
      } else if (field === 'descricao') {
        sql = `UPDATE debts SET description = ?, updated_by = ?, updated_at = ? WHERE id = ?`;
        params = [value, phone, now, id];
      } else if (field === 'vencimento') {
        const due = parseBrazilDate(value);
        if (!due) return reject(new Error('Data inválida. Use dd/mm/aaaa.'));
        const monthRef = monthRefFromDate(due);
        sql = `UPDATE debts SET due_date = ?, month_ref = ?, updated_by = ?, updated_at = ? WHERE id = ?`;
        params = [due, monthRef, phone, now, id];
      } else {
        return reject(new Error('Campo inválido. Use valor, descricao ou vencimento.'));
      }

      db.run(sql, params, function (err2) {
        if (err2) return reject(err2);
        logAction('EDIT_DEBT', `ID ${id} | ${field}=${value}`, phone);
        db.get(`SELECT * FROM debts WHERE id = ?`, [id], (err3, updated) => {
          if (err3) return reject(err3);
          resolve(updated);
        });
      });
    });
  });
}

function buildListMessage(monthInput) {
  return listDebts(monthInput).then(({ monthRef, rows }) => {
    if (!rows.length) {
      return `📭 Nenhuma dívida cadastrada em ${monthRefLabel(monthRef)}.`;
    }

    const header = `📋 Dívidas de ${monthRefLabel(monthRef)}\n`;
    const lines = rows.map(r => {
      const pago = Number(r.paid_amount || 0) > 0 ? ` | pago ${formatBRL(r.paid_amount)}` : '';
      return `#${r.id} | ${r.description} | ${formatBRL(r.amount)} | venc. ${formatDateBR(r.due_date)} | ${r.status}${pago}`;
    });
    return `${header}\n${lines.join('\n')}`;
  });
}

function buildSummaryMessage(monthInput) {
  return getSummary(monthInput).then(({ monthRef, total, paid, pending, count }) => {
    return [
      `📊 Resumo de ${monthRefLabel(monthRef)}`,
      `Total de contas: ${count}`,
      `Total do mês: ${formatBRL(total)}`,
      `Já pago: ${formatBRL(paid)}`,
      `Falta pagar: ${formatBRL(pending)}`
    ].join('\n');
  });
}

module.exports = {
  addDebt,
  listDebts,
  getSummary,
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
  parseMonthInput,
  monthRefLabel
};
