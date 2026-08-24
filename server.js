const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Redireciona /index.html para a raiz /
app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

// Servir os ficheiros estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});