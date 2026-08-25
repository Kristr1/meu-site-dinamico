const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para ler dados enviados pelo Front-end em JSON
app.use(express.json());

// Base de dados temporária em memória (Substituir por PostgreSQL/MongoDB em produção)
const utilizadoresDB = [];

// 1. Redirecionamento de index.html para a raiz /
app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

// 2. Rota para carregar o HTML de login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login.html', (req, res) => {
  res.redirect(301, '/login');
});

// 3. ROTA DE API: Registar / Guardar Conta de Forma Segura
app.post('/api/registar', async (req, res) => {
  const { email, senha } = req.body;

  // Validação no Back-end
  if (!email || !senha) {
    return res.status(400).json({ mensagem: 'Preencha todos os campos.' });
  }

  // Verifica se o utilizador já existe
  const jaExiste = utilizadoresDB.find(u => u.email === email);
  if (jaExiste) {
    return res.status(400).json({ mensagem: 'Este e-mail já está registado.' });
  }

  try {
    // Hashing da palavra-passe (10 rounds de salt)
    const senhaHash = await bcrypt.hash(senha, 10);

    // Guarda APENAS o hash na base de dados, NUNCA a senha real
    const novoUtilizador = {
      id: Date.now(),
      email: email,
      senhaHash: senhaHash
    };

    utilizadoresDB.push(novoUtilizador);
    console.log('Utilizador guardado com sucesso:', { id: novoUtilizador.id, email: novoUtilizador.email, hash: novoUtilizador.senhaHash });

    res.status(201).json({ mensagem: 'Conta criada com sucesso!' });
  } catch (erro) {
    res.status(500).json({ mensagem: 'Erro interno ao guardar a conta.' });
  }
});

// 4. Servir os ficheiros estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});