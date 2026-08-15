const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Cria/Abre a base de dados (cria o ficheiro 'loja.db' no teu portátil)
const db = new Database('loja.db');

// 2. Prepara a tabela de produtos
db.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    preco REAL
  )
`);

// 3. Insere dados de teste se a tabela estiver vazia
const count = db.prepare('SELECT COUNT(*) AS total FROM produtos').get();
if (count.total === 0) {
  const insert = db.prepare('INSERT INTO produtos (nome, preco) VALUES (?, ?)');
  insert.run('iPhone 16', 999.99);
  insert.run('MacBook Pro', 1499.00);
  insert.run('AirPods Max', 549.00);
}

// 4. Rota do site: Consulta a BD e devolve o HTML
app.get('/', (req, res) => {
  const produtos = db.prepare('SELECT * FROM produtos').all();

  let listaHTML = '';
  produtos.forEach(p => {
    listaHTML += `<li style="font-size: 18px; margin-bottom: 10px;">
      <strong>${p.nome}</strong> - ${p.preco}€
    </li>`;
  });

  const htmlFinal = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meu Site Dinâmico</title>
    </head>
    <body style="font-family: sans-serif; padding: 30px; background-color: #f4f4f9;">
        <h1>Produtos na Base de Dados (Surface ARM64)</h1>
        <ul>
            ${listaHTML}
        </ul>
        <p><em>Este HTML foi gerado dinamicamente pelo servidor no teu Surface!</em></p>
    </body>
    </html>
  `;

  res.send(htmlFinal);
});

// 5. Inicia o servidor acessível na rede local
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n===========================================`);
  console.log(`Servidor a correr no teu Surface!`);
  console.log(`Acede no portátil em: http://localhost:${PORT}`);
  console.log(`===========================================\n`);
});