function nowISO() {
  return new Date().toISOString();
}

function normalizePhone(phone = '') {
  return String(phone).replace(/\D/g, '');
}

function monthRefFromDate(dateString) {
  if (!dateString) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  const normalized = parseBrazilDate(dateString);
  if (!normalized) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  return normalized.slice(0, 7);
}

function parseBrazilDate(input) {
  if (!input) return null;
  const clean = input.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  const full = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (full) {
    const [, dd, mm, yyyy] = full;
    return `${yyyy}-${mm}-${dd}`;
  }

  const short = clean.match(/^(\d{2})\/(\d{2})$/);
  if (short) {
    const [, dd, mm] = short;
    const yyyy = new Date().getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function formatBRL(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDateBR(dateString) {
  if (!dateString) return '-';
  const m = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateString;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function parseAmount(text) {
  if (!text) return null;
  const clean = String(text).trim().replace(/\./g, '').replace(',', '.');
  const num = Number(clean);
  return Number.isFinite(num) ? num : null;
}

function parseMonthInput(text) {
  if (!text) return monthRefFromDate();
  const clean = text.trim();

  if (/^\d{4}-\d{2}$/.test(clean)) return clean;

  const br = clean.match(/^(\d{2})\/(\d{4})$/);
  if (br) {
    return `${br[2]}-${br[1]}`;
  }

  const names = {
    janeiro: '01', fevereiro: '02', marco: '03', 'março': '03', abril: '04', maio: '05', junho: '06',
    julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
  };

  const parts = clean.toLowerCase().split(/[\s/-]+/).filter(Boolean);
  if (parts.length >= 2 && names[parts[0]]) {
    return `${parts[1]}-${names[parts[0]]}`;
  }

  return monthRefFromDate();
}

function monthRefLabel(monthRef) {
  const [yyyy, mm] = monthRef.split('-');
  const names = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  return `${names[Number(mm) - 1]}/${yyyy}`;
}

module.exports = {
  nowISO,
  normalizePhone,
  monthRefFromDate,
  parseBrazilDate,
  formatBRL,
  formatDateBR,
  parseAmount,
  parseMonthInput,
  monthRefLabel
};
