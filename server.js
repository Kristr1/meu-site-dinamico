const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Ligação à Base de Dados (usa a variável de ambiente DATABASE_URL em produção)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Cria a tabela de utilizadores na base de dados se ela ainda não existir
async function criarTabela() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS utilizadores (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      senha_hash VARCHAR(255) NOT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
criarTabela().catch(console.error);

// 1. Rota de Registo Segura (Gravação permanente na Base de Dados)
app.post('/api/registar', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ mensagem: 'Preencha todos os campos.' });
  }

  try {
    // Verificar se o e-mail já existe na base de dados
    const utilizadorExiste = await pool.query('SELECT * FROM utilizadores WHERE email = $1', [email]);
    if (utilizadorExiste.rows.length > 0) {
      return res.status(400).json({ mensagem: 'Este e-mail já está registado.' });
    }

    // Hashing da palavra-passe
    const senhaHash = await bcrypt.hash(senha, 10);

    // Inserir na tabela do PostgreSQL
    await pool.query(
      'INSERT INTO utilizadores (email, senha_hash) VALUES ($1, $2)',
      [email, senhaHash]
    );

    res.status(201).json({ mensagem: 'Conta criada e guardada com sucesso!' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ mensagem: 'Erro ao guardar na base de dados.' });
  }
});

// 2. Rota de Consulta (Para ver os utilizadores gravados na Base de Dados)
app.get('/api/utilizadores', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT id, email, criado_em FROM utilizadores');
    res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ mensagem: 'Erro ao consultar a base de dados.' });
  }
});

// 3. Servir os ficheiros estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Servir a página de login quando acederem a /login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});