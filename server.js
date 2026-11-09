const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.sqlite');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erro ao conectar no banco:', err.message);
    process.exit(1);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      categoria TEXT,
      cidade TEXT,
      endereco TEXT,
      website TEXT,
      whatsapp TEXT,
      google_url TEXT,
      status TEXT DEFAULT 'novo',
      observacoes TEXT,
      valor TEXT,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `, (createErr) => {
    if (createErr) {
      console.error('Erro ao criar tabela:', createErr.message);
      process.exit(1);
    }

    console.log('Banco de dados pronto.');
  });
});

app.get('/api/stats', (req, res) => {
  db.all(`
    SELECT status, COUNT(*) as total
    FROM businesses
    GROUP BY status
    ORDER BY status
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const stats = {
      total: rows.reduce((sum, item) => sum + item.total, 0),
      novo: 0,
      contatado: 0,
      respondeu: 0,
      interessado: 0,
      cliente: 0,
      nao_quero: 0
    };

    rows.forEach((row) => {
      const key = row.status;
      if (stats[key] !== undefined) {
        stats[key] = row.total;
      }
    });

    return res.json(stats);
  });
});

app.get('/api/businesses', (req, res) => {
  const { status, cidade } = req.query;
  let query = 'SELECT * FROM businesses';
  const params = [];

  if (status || cidade) {
    const conditions = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (cidade) {
      conditions.push('cidade = ?');
      params.push(cidade);
    }

    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY criado_em DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.json(rows);
  });
});

app.post('/api/businesses', (req, res) => {
  const {
    nome,
    categoria,
    cidade,
    endereco,
    website,
    whatsapp,
    google_url,
    status,
    observacoes,
    valor
  } = req.body;

  if (!nome) {
    return res.status(400).json({ error: 'Nome do comércio é obrigatório.' });
  }

  const query = `
    INSERT INTO businesses (
      nome, categoria, cidade, endereco, website, whatsapp, google_url, status, observacoes, valor
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    nome,
    categoria || '',
    cidade || '',
    endereco || '',
    website || '',
    whatsapp || '',
    google_url || '',
    status || 'novo',
    observacoes || '',
    valor || ''
  ], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.status(201).json({ id: this.lastID, message: 'Comércio cadastrado com sucesso.' });
  });
});

app.put('/api/businesses/:id', (req, res) => {
  const { id } = req.params;
  const {
    nome,
    categoria,
    cidade,
    endereco,
    website,
    whatsapp,
    google_url,
    status,
    observacoes,
    valor
  } = req.body;

  const query = `
    UPDATE businesses
    SET nome = ?, categoria = ?, cidade = ?, endereco = ?, website = ?, whatsapp = ?, google_url = ?, status = ?, observacoes = ?, valor = ?
    WHERE id = ?
  `;

  db.run(query, [
    nome,
    categoria || '',
    cidade || '',
    endereco || '',
    website || '',
    whatsapp || '',
    google_url || '',
    status || 'novo',
    observacoes || '',
    valor || '',
    id
  ], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.json({ message: 'Comércio atualizado com sucesso.' });
  });
});

app.delete('/api/businesses/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM businesses WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.json({ message: 'Comércio removido.' });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
