/**
 * Servidor SSE simples para testar a POC
 * Execute: node test-sse-server.js
 */

const http = require('http');
const url = require('url');

const PORT = 3005;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/sse') {
    console.log('Nova conexão SSE estabelecida');

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    res.write('data: Conexão SSE estabelecida\n\n');

    const interval = setInterval(() => {
      const timestamp = new Date().toISOString();
      const data = JSON.stringify({
        message: `Mensagem do servidor - ${timestamp}`,
        counter: Math.floor(Math.random() * 1000),
        timestamp,
      });

      res.write(`data: ${data}\n\n`);
    }, 2000);

    req.on('close', () => {
      console.log('Conexão SSE fechada');
      clearInterval(interval);
    });

    return;
  }

  if (parsedUrl.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>SSE Test Server</title></head>
        <body>
          <h1>SSE Test Server</h1>
          <p>Servidor rodando na porta ${PORT}</p>
          <p>Endpoint SSE: <a href="/sse">/sse</a></p>
          <script>
            const eventSource = new EventSource('/sse');
            eventSource.onmessage = (event) => {
              console.log('Mensagem recebida:', event.data);
              const div = document.createElement('div');
              div.textContent = event.data;
              document.body.appendChild(div);
            };
          </script>
        </body>
      </html>
    `);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor SSE rodando em http://localhost:${PORT}`);
  console.log(`📡 Endpoint SSE disponível em http://localhost:${PORT}/sse`);
  console.log(`🌐 Página de teste em http://localhost:${PORT}/`);
  console.log(`\nPara testar no React Native:`);
  console.log(`- Execute o app`);
  console.log(`- Use a URL: http://localhost:${PORT}/sse`);
  console.log(`- As mensagens aparecerão a cada 2 segundos`);
});

server.on('error', (error) => {
  console.error('Erro no servidor:', error);
});
