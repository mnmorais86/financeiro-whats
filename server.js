require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');
const { normalizePhone, formatBRL, formatDateBR } = require('./utils');
const { sendWhatsAppText } = require('./whatsapp');
const { handleCommand, helpText } = require('./commandHandler');
const { getSummary } = require('./debtService');

const app = express();
const PORT = process.env.PORT || 3000;
const allowedNumbers = (process.env.ALLOWED_NUMBERS || '')
  .split(',')
  .map(v => normalizePhone(v))
  .filter(Boolean);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'troque-isso',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 12 }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  return res.redirect('/login');
}

app.get('/', requireAuth, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  db.all(
    `SELECT * FROM debts WHERE month_ref = ? ORDER BY status ASC, COALESCE(due_date, '9999-12-31') ASC, id DESC`,
    [month],
    async (err, debts) => {
      if (err) return res.status(500).send(err.message);
      const summary = await getSummary(month);
      res.render('index', { debts, summary, month, formatBRL, formatDateBR });
    }
  );
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { user, password } = req.body;
  const validUser = process.env.WEB_USER || 'admin';
  const validPassword = process.env.WEB_PASSWORD || '123456';

  const passOk = await bcrypt.compare(password, bcrypt.hashSync(validPassword, 8)).catch(() => false) || password === validPassword;

  if (user === validUser && passOk) {
    req.session.authenticated = true;
    return res.redirect('/');
  }

  return res.status(401).render('login', { error: 'Usuário ou senha inválidos.' });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = normalizePhone(message.from);
    const text = message?.text?.body || '';

    if (allowedNumbers.length && !allowedNumbers.includes(from)) {
      await sendWhatsAppText(from, '⛔ Este número não está autorizado a usar o controle de dívidas.');
      return res.sendStatus(200);
    }

    const reply = await handleCommand(text, from);
    await sendWhatsAppText(from, reply);
    return res.sendStatus(200);
  } catch (error) {
    console.error('Erro no webhook:', error);
    return res.sendStatus(200);
  }
});

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post('/panel/add', requireAuth, (req, res) => {
  const { description, amount, due_date } = req.body;
  const fakePhone = 'painel-web';
  handleCommand(`add ${amount} ${description} ${due_date || ''}`.trim(), fakePhone)
    .then(() => res.redirect('/'))
    .catch(err => res.status(500).send(err.message));
});

app.post('/panel/pay/:id', requireAuth, (req, res) => {
  handleCommand(`pagar ${req.params.id}`, 'painel-web')
    .then(() => res.redirect('/'))
    .catch(err => res.status(500).send(err.message));
});

app.post('/panel/undo/:id', requireAuth, (req, res) => {
  handleCommand(`desfazer ${req.params.id}`, 'painel-web')
    .then(() => res.redirect('/'))
    .catch(err => res.status(500).send(err.message));
});

app.post('/panel/delete/:id', requireAuth, (req, res) => {
  handleCommand(`apagar ${req.params.id}`, 'painel-web')
    .then(() => res.redirect('/'))
    .catch(err => res.status(500).send(err.message));
});

app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Sistema online' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log('Comandos disponíveis no WhatsApp:');
  console.log(helpText());
});
