const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_super_segura_goodleans';

app.use(express.json());

// Ligação à Base de Dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Criar tabela na base de dados
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

// Helper para ler cookies manualmente do cabeçalho
function obterCookie(req, nome) {
  const cookies = req.headers.cookie;
  if (!cookies) return null;
  const match = cookies.match(new RegExp('(^| )' + nome + '=([^;]+)'));
  return match ? match[2] : null;
}

// ROTA DE REGISTO (Cria a conta e inicia sessão automaticamente)
app.post('/api/registar', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ mensagem: 'Preencha todos os campos.' });
  }

  try {
    const utilizadorExiste = await pool.query('SELECT * FROM utilizadores WHERE email = $1', [email]);
    if (utilizadorExiste.rows.length > 0) {
      return res.status(400).json({ mensagem: 'Este e-mail já está registado.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    
    // Inserir e retornar o ID e Email do novo utilizador (RETURNING id, email)
    const novoUtilizador = await pool.query(
      'INSERT INTO utilizadores (email, senha_hash) VALUES ($1, $2) RETURNING id, email',
      [email, senhaHash]
    );

    const utilizador = novoUtilizador.rows[0];

    // Gerar o JWT para o novo utilizador
    const token = jwt.sign(
      { id: utilizador.id, email: utilizador.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Enviar o Token no Cookie HTTP-Only
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });

    res.status(201).json({ mensagem: 'Conta criada e sessão iniciada!' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ mensagem: 'Erro ao guardar na base de dados.' });
  }
});

// ROTA DE LOGIN (Gera o Token no Cookie)
app.post('/api/entrar', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ mensagem: 'Preencha todos os campos.' });
  }

  try {
    const resultado = await pool.query('SELECT * FROM utilizadores WHERE email = $1', [email]);

    if (resultado.rows.length === 0) {
      return res.status(401).json({ mensagem: 'E-mail ou palavra-passe inválidos.' });
    }

    const utilizador = resultado.rows[0];
    const senhaValida = await bcrypt.compare(senha, utilizador.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ mensagem: 'E-mail ou palavra-passe inválidos.' });
    }

    // Gerar o JWT (válido por 7 dias)
    const token = jwt.sign(
      { id: utilizador.id, email: utilizador.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Enviar o Token como Cookie HTTP-Only seguro
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias em ms
    });

    res.json({ mensagem: 'Entrada efetuada com sucesso!' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ mensagem: 'Erro ao efetuar a entrada.' });
  }
});

// ROTA PARA VERIFICAR SESSÃO ATIVA (Usada pelo Frontend)
app.get('/api/perfil', (req, res) => {
  const token = obterCookie(req, 'token');

  if (!token) {
    return res.status(401).json({ autenticado: false });
  }

  try {
    const utilizador = jwt.verify(token, JWT_SECRET);
    res.json({ autenticado: true, email: utilizador.email });
  } catch (erro) {
    res.status(401).json({ autenticado: false });
  }
});

// ROTA DE LOGOUT (Limpa o Cookie)
app.post('/api/sair', (req, res) => {
  res.clearCookie('token');
  res.json({ mensagem: 'Sessão encerrada com sucesso.' });
});

// FICHEIROS ESTÁTICOS E ROTAS HTML
app.use(express.static(path.join(__dirname, 'public')));

app.get('/create-account', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create-account.html'));
});

app.get('/calculadora-precos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'calculadora-precos.html'));
});

app.get(['/login', '/entrar'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});

async function criarTabelasProdutos() {
  // 1. Tabela base dos produtos e dados nutricionais
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      marca VARCHAR(100),
      categoria VARCHAR(100),
      calorias_100g INT,
      proteinas_100g DECIMAL(4,1),
      hidratos_100g DECIMAL(4,1),
      gorduras_100g DECIMAL(4,1),
      imagem_url TEXT
    );
  `);

  // 2. Tabela de lojas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lojas (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL -- Ex: Continente, Pingo Doce, Auchan
    );
  `);

  // 3. Tabela de ligação: Preço de cada produto em cada loja
  await pool.query(`
    CREATE TABLE IF NOT EXISTS precos_lojas (
      id SERIAL PRIMARY KEY,
      produto_id INT REFERENCES produtos(id) ON DELETE CASCADE,
      loja_id INT REFERENCES lojas(id) ON DELETE CASCADE,
      preco DECIMAL(6,2) NOT NULL,
      em_promocao BOOLEAN DEFAULT FALSE,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
criarTabelasProdutos().catch(console.error);

app.get('/api/tabela-produtos', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.nome AS produto_nome,
        p.marca,
        p.categoria,
        p.calorias_100g,
        p.proteinas_100g,
        p.hidratos_100g,
        p.gorduras_100g,
        l.nome AS loja_nome,
        pl.preco,
        pl.em_promocao
      FROM precos_lojas pl
      JOIN produtos p ON pl.produto_id = p.id
      JOIN lojas l ON pl.loja_id = l.id
      ORDER BY p.nome ASC;
    `;
    const resultado = await pool.query(query);
    res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ mensagem: 'Erro ao obter dados dos produtos.' });
  }
});
