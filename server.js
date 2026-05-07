const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const BIN_ID = process.env.BIN_ID;
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || 'Juptic81';

// ─── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === PANEL_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
  }
});

// ─── Lire la config ────────────────────────────────────────────────────────────
app.get('/api/config', async (req, res) => {
  const { password } = req.query;
  if (password !== PANEL_PASSWORD) return res.status(401).json({ error: 'Non autorisé' });

  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_API_KEY }
    });
    const data = await response.json();
    res.json(data.record);
  } catch (e) {
    res.status(500).json({ error: 'Erreur JSONbin', details: e.message });
  }
});

// ─── Sauvegarder la config ─────────────────────────────────────────────────────
app.put('/api/config', async (req, res) => {
  const { password } = req.query;
  if (password !== PANEL_PASSWORD) return res.status(401).json({ error: 'Non autorisé' });

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

app.listen(3000, () => console.log('Panneau admin actif sur le port 3000'));
