const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 1. Redireciona /index.html para a raiz /
app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

// 2. Rota limpa para o Login: entrega public/login.html ao aceder a /login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 3. Redireciona /login.html para o URL limpo /login (caso alguém tente aceder com .html)
app.get('/login.html', (req, res) => {
  res.redirect(301, '/login');
});

// 4. Servir os ficheiros estáticos (CSS, imagens, etc.)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});