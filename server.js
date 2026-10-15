// Serveur Excelsior ONLINE — réservations + admin + email auto
// Local: npm install / npm start → http://localhost:3001
// Online (Render): push GitHub → New Web Service → env vars → deploy
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

// ---------- Stockage réservations (fichier JSON sur serveur) ----------
const DATA = path.join(__dirname, 'data', 'reservations.json');
function load() {
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
  catch (e) { return []; }
}
function save(a) {
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  fs.writeFileSync(DATA, JSON.stringify(a, null, 2));
}

// ---------- Auth admin (token simple) ----------
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'excelsior123';
const tokens = new Set();
app.post('/api/login', (req, res) => {
  if (req.body && req.body.password === ADMIN_PASSWORD) {
    const t = crypto.randomBytes(24).toString('hex');
    tokens.add(t);
    return res.json({ ok: true, token: t });
  }
  res.status(401).json({ ok: false, error: 'Mot de passe incorrect' });
});
function needAuth(req, res, next) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  // Token session OU mot de passe admin direct (survit aux restarts Render)
  if ((t && tokens.has(t)) || (t && t === ADMIN_PASSWORD)) return next();
  res.status(401).json({ ok: false, error: 'Non autorisé' });
}

// ---------- Email via SendGrid API (HTTPS — khdam 3la Render free, bla SMTP) ----------
async function sendMail(r, accepted) {
  const m = buildMsg(r, accepted);
  const fromEmail = process.env.SENDER_EMAIL || 'excelsior.casa.ma@gmail.com';
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.SENDGRID_API_KEY },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: r.email, name: r.name }] }],
      from: { email: fromEmail, name: 'Hotel Excelsior Casablanca' },
      reply_to: { email: fromEmail },
      subject: m.subj,
      content: [
        { type: 'text/plain', value: m.text },
        { type: 'text/html', value: m.html }
      ]
    })
  });
  if (!res.ok) { const t = await res.text(); throw new Error('SendGrid ' + res.status + ': ' + t); }
}
function buildMsg(r, accepted) {
  const id = String(r.id).slice(-5);
  const subj = accepted
    ? `Confirmation de votre reservation #${id} - Hotel Excelsior Casablanca`
    : `Votre reservation #${id} - Hotel Excelsior Casablanca`;
  const text =
`Bonjour ${r.name},

${accepted ? 'Nous avons le plaisir de confirmer votre reservation.' : 'Nous sommes desoles, votre reservation a ete annulee. Contactez-nous pour une autre date.'}

Hotel Excelsior Casablanca
Place des Nations Unies, 20000 Casablanca, Maroc
Tel : +212 522 222 222

Details de la reservation #${id} :
- Chambre : ${r.room}
- Arrivee : ${r.in}
- Depart : ${r.out}
- Voyageurs : ${r.guests}
- Total : ${r.total} MAD (paiement a l'hotel)

--------------------
مرحباً ${r.name}،
${accepted ? 'تم تأكيد الحجز ديالك.' : 'تم إلغاء الحجز. تواصل معانا لتاريخ آخر.'}
الغرفة: ${r.room} | الوصول: ${r.in} | المغادرة: ${r.out} | المجموع: ${r.total} درهم (الخلاص في الفندق)

Merci de votre confiance,
L'equipe Excelsior
Hotel Excelsior Casablanca — +212 522 222 222`;
  const html =
`<p>Bonjour ${r.name},</p>
<p>${accepted ? '<strong>Nous avons le plaisir de confirmer votre r&eacute;servation.</strong>' : 'Nous sommes d&eacute;sol&eacute;s, votre r&eacute;servation a &eacute;t&eacute; annul&eacute;e.'}</p>
<ul>
<li>H&ocirc;tel Excelsior Casablanca — Place des Nations Unies, 20000 Casablanca — +212 522 222 222</li>
<li>R&eacute;servation <strong>#${id}</strong> : ${r.room} — du ${r.in} au ${r.out} — ${r.guests} voyageur(s)</li>
<li>Total : <strong>${r.total} MAD</strong> (paiement &agrave; l'h&ocirc;tel)</li>
</ul>
<p>Merci de votre confiance,<br>L'&eacute;quipe Excelsior<br>Hotel Excelsior Casablanca — +212 522 222 222</p>`;
  return { subj, text, html };
}

// ---------- API publique : créer réservation (depuis site) ----------
app.post('/api/reservations', (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email || !b.in || !b.out || !b.room) {
    return res.status(400).json({ ok: false, error: 'Champs manquants' });
  }
  const all = load();
  const r = {
    id: Date.now(), name: b.name, phone: b.phone || '', email: b.email,
    room: b.room, in: b.in, out: b.out, guests: b.guests || '2',
    msg: b.msg || '', total: b.total || 0,
    status: 'En attente', notified: '', notifiedAt: '',
    created: new Date().toLocaleString()
  };
  all.push(r); save(all);
  res.json({ ok: true, reservation: r });
});

// ---------- API admin ----------
app.get('/api/status', (req, res) => {
  res.json({ ok: true, mailer: !!process.env.SENDGRID_API_KEY, user: process.env.SENDER_EMAIL || null, count: load().length });
});
app.get('/api/reservations', needAuth, (req, res) => {
  res.json({ ok: true, reservations: load() });
});
app.patch('/api/reservations/:id', needAuth, async (req, res) => {
  const all = load();
  const r = all.find(x => String(x.id) === String(req.params.id));
  if (!r) return res.status(404).json({ ok: false });
  if (req.body.status) r.status = req.body.status;
  if (r.status === 'Confirmée' || r.status === 'Annulée') {
    try {
      await sendMail(r, r.status === 'Confirmée');
      r.notified = 'auto-email'; r.notifiedAt = new Date().toLocaleString();
    } catch (e) { console.error('MAIL FAIL:', e.message); }
  }
  save(all);
  res.json({ ok: true, reservation: r });
});
app.post('/api/reservations/:id/notify', needAuth, async (req, res) => {
  const all = load();
  const r = all.find(x => String(x.id) === String(req.params.id));
  if (!r) return res.status(404).json({ ok: false });
  try {
    await sendMail(r, r.status !== 'Annulée');
    r.notified = 'auto-email'; r.notifiedAt = new Date().toLocaleString();
    save(all);
    res.json({ ok: true });
  } catch (e) { console.error('MAIL FAIL:', e.message); res.status(500).json({ ok: false }); }
});
app.delete('/api/reservations/:id', needAuth, (req, res) => {
  save(load().filter(x => String(x.id) !== String(req.params.id)));
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Excelsior server khdam 3la port ${PORT}`));
