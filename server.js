const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const JSONBIN_API_KEY  = process.env.JSONBIN_API_KEY;
const BIN_ID           = process.env.BIN_ID;
const PROFILES_BIN_ID  = process.env.PROFILES_BIN_ID;
const PANEL_PASSWORD   = process.env.PANEL_PASSWORD || 'Juptic81';

// ─── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === PANEL_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
  }
});

// ─── Middleware auth query ─────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const password = req.query.password || req.body?.password;
  if (password !== PANEL_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

// ─── Config bot ────────────────────────────────────────────────────────────────
app.get('/api/config', authMiddleware, async (req, res) => {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    const text = await response.text();
    console.log('JSONbin brut:', text.slice(0, 300));
    const data = JSON.parse(text);
    const record = data.record || data || {};
    console.log('Record envoyé:', JSON.stringify(record).slice(0, 200));
    res.set('Cache-Control', 'no-store');
    res.json(record);
  } catch (e) {
    console.error('Erreur JSONbin:', e.message);
    res.status(500).json({ error: 'Erreur JSONbin', details: e.message });
  }
});

app.put('/api/config', authMiddleware, async (req, res) => {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json({ success: true, data: data.record });
  } catch (e) {
    res.status(500).json({ error: 'Erreur JSONbin', details: e.message });
  }
});

// ─── Profils membres ───────────────────────────────────────────────────────────
app.get('/api/profiles', authMiddleware, async (req, res) => {
  if (!PROFILES_BIN_ID) return res.json({ memberProfiles: {}, serverVocabulary: {} });
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${PROFILES_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    const data = await response.json();
    res.json(data.record || { memberProfiles: {}, serverVocabulary: {} });
  } catch (e) {
    res.status(500).json({ error: 'Erreur JSONbin', details: e.message });
  }
});

app.put('/api/profiles', authMiddleware, async (req, res) => {
  if (!PROFILES_BIN_ID) return res.status(400).json({ error: 'PROFILES_BIN_ID non configuré' });
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${PROFILES_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur JSONbin', details: e.message });
  }
});

// Modifier le niveau d'amitié d'un membre
app.patch('/api/profiles/:userId/friendship', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { level } = req.body;

  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${PROFILES_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    const data = await response.json();
    const profiles = data.record || { memberProfiles: {}, serverVocabulary: {} };

    if (!profiles.memberProfiles[userId]) {
      return res.status(404).json({ error: 'Membre introuvable' });
    }

    profiles.memberProfiles[userId].friendshipLevel = Math.max(-5, Math.min(20, level));

    await fetch(`https://api.jsonbin.io/v3/b/${PROFILES_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(profiles)
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Supprimer un incident
app.delete('/api/profiles/:userId/incidents/:index', authMiddleware, async (req, res) => {
  const { userId, index } = req.params;

  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${PROFILES_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    const data = await response.json();
    const profiles = data.record || { memberProfiles: {}, serverVocabulary: {} };

    if (!profiles.memberProfiles[userId]) {
      return res.status(404).json({ error: 'Membre introuvable' });
    }

    profiles.memberProfiles[userId].incidents.splice(parseInt(index), 1);

    await fetch(`https://api.jsonbin.io/v3/b/${PROFILES_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(profiles)
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Supprimer un mot du vocabulaire d'un membre
app.delete('/api/profiles/:userId/vocabulary/:word', authMiddleware, async (req, res) => {
  const { userId, word } = req.params;

  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${PROFILES_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    const data = await response.json();
    const profiles = data.record || { memberProfiles: {}, serverVocabulary: {} };

    if (profiles.memberProfiles[userId]?.vocabulary) {
      delete profiles.memberProfiles[userId].vocabulary[word];
    }

    await fetch(`https://api.jsonbin.io/v3/b/${PROFILES_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(profiles)
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Supprimer un mot du vocabulaire global
app.delete('/api/vocabulary/:word', authMiddleware, async (req, res) => {
  const { word } = req.params;

  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${PROFILES_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    const data = await response.json();
    const profiles = data.record || { memberProfiles: {}, serverVocabulary: {} };

    delete profiles.serverVocabulary[word];

    await fetch(`https://api.jsonbin.io/v3/b/${PROFILES_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(profiles)
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('Panneau admin actif sur le port 3000'));
