/**
 * Servidor SSE para simular distribuição de carga entre dois clientes
 * Execute: node test-sse-server.js
 */

const http = require('http');
const url = require('url');

const PORT = 3005;

// Estado global da carga
let carga = {
  id: 'CARGA-001',
  produtos: [],
  clientes: new Map(), // Map<clientId, { res, produtosEmProcessamento: [] }>
  proximoClienteId: 1,
  intervaloSimulacao: null, // Intervalo único para simulação
};

// Inicializa uma nova carga com produtos
function inicializarCarga(numProdutos = 10) {
  carga.produtos = Array.from({ length: numProdutos }, (_, i) => ({
    id: `PROD-${String(i + 1).padStart(3, '0')}`,
    nome: `Produto ${i + 1}`,
    status: 'disponivel', // disponivel, em_processamento, finalizado
    clienteId: null,
    finalizadoEm: null,
  }));
  console.log(`✅ Carga ${carga.id} inicializada com ${numProdutos} produtos`);
}

// Simula o segundo cliente (backend)
function simularSegundoCliente() {
  const produtosDisponiveis = carga.produtos.filter(p => p.status === 'disponivel');
  
  if (produtosDisponiveis.length === 0) {
    return;
  }

  const produto = produtosDisponiveis[0];
  produto.status = 'em_processamento';
  produto.clienteId = 'CLIENTE-SIMULADO';

  console.log(`🤖 Cliente simulado pegou produto ${produto.id}`);

  // Notifica todos os clientes conectados
  broadcastEvent({
    type: 'produto_pegue',
    produto: { ...produto },
    clienteId: 'CLIENTE-SIMULADO',
  });

  // Simula finalização após 8-12 segundos
  const tempoProcessamento = 8000 + Math.random() * 4000;
  setTimeout(() => {
    produto.status = 'finalizado';
    produto.finalizadoEm = new Date().toISOString();

    console.log(`✅ Cliente simulado finalizou produto ${produto.id}`);

    broadcastEvent({
      type: 'produto_finalizado',
      produto: { ...produto },
      clienteId: 'CLIENTE-SIMULADO',
    });

    verificarFinalizacaoCarga();
  }, tempoProcessamento);
}

// Verifica se todos os produtos foram finalizados
function verificarFinalizacaoCarga() {
  const todosFinalizados = carga.produtos.every(p => p.status === 'finalizado');
  
  if (todosFinalizados) {
    console.log('🎉 Todos os produtos foram finalizados! Encerrando conexões...');
    
    broadcastEvent({
      type: 'carga_finalizada',
      mensagem: 'Todos os produtos foram finalizados. A conexão será encerrada.',
      carga: {
        id: carga.id,
        totalProdutos: carga.produtos.length,
        produtosFinalizados: carga.produtos.length,
      },
    });

    // Encerra todas as conexões após 1 segundo
    setTimeout(() => {
      carga.clientes.forEach((cliente, clientId) => {
        try {
          cliente.res.write(`event: close\ndata: ${JSON.stringify({ mensagem: 'Carga finalizada' })}\n\n`);
          cliente.res.end();
        } catch (error) {
          console.error(`Erro ao encerrar conexão do cliente ${clientId}:`, error.message);
        }
      });
      carga.clientes.clear();
      // Limpa intervalo de simulação se existir
      if (carga.intervaloSimulacao) {
        clearInterval(carga.intervaloSimulacao);
        carga.intervaloSimulacao = null;
      }
      console.log('✅ Carga finalizada. Servidor aguardando nova inicialização manual.');
    }, 1000);
  }
}

// Envia evento para todos os clientes conectados
function broadcastEvent(evento) {
  try {
    // Adiciona informações de clientes conectados ao evento
    const eventoComClientes = {
      ...evento,
      clientesConectados: Array.from(carga.clientes.keys()),
      totalClientes: carga.clientes.size,
    };
    const data = JSON.stringify(eventoComClientes);
    carga.clientes.forEach((cliente, clientId) => {
      try {
        if (cliente.res && !cliente.res.destroyed) {
          cliente.res.write(`data: ${data}\n\n`);
        }
      } catch (error) {
        console.error(`Erro ao enviar evento para cliente ${clientId}:`, error.message);
        carga.clientes.delete(clientId);
      }
    });
  } catch (error) {
    console.error('Erro ao fazer broadcast do evento:', error.message);
  }
}

// Inicializa carga ao iniciar o servidor
inicializarCarga();

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Endpoint para pegar um produto
  if (parsedUrl.pathname === '/pegar-produto' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { clienteId } = JSON.parse(body);
        const produtosDisponiveis = carga.produtos.filter(p => p.status === 'disponivel');
        
        if (produtosDisponiveis.length === 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            sucesso: false, 
            mensagem: 'Nenhum produto disponível' 
          }));
          return;
        }

        const produto = produtosDisponiveis[0];
        produto.status = 'em_processamento';
        produto.clienteId = clienteId;

        console.log(`📦 Cliente ${clienteId} pegou produto ${produto.id}`);

        // Notifica todos os clientes
        broadcastEvent({
          type: 'produto_pegue',
          produto: { ...produto },
          clienteId,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          sucesso: true, 
          produto: { ...produto } 
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          sucesso: false, 
          mensagem: error.message 
        }));
      }
    });
    return;
  }

  // Endpoint para finalizar um produto
  if (parsedUrl.pathname === '/finalizar-produto' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { clienteId, produtoId } = JSON.parse(body);
        const produto = carga.produtos.find(p => p.id === produtoId);
        
        if (!produto) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            sucesso: false, 
            mensagem: 'Produto não encontrado' 
          }));
          return;
        }

        if (produto.clienteId !== clienteId) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            sucesso: false, 
            mensagem: 'Produto não pertence a este cliente' 
          }));
          return;
        }

        produto.status = 'finalizado';
        produto.finalizadoEm = new Date().toISOString();

        console.log(`✅ Cliente ${clienteId} finalizou produto ${produto.id}`);

        // Notifica todos os clientes
        broadcastEvent({
          type: 'produto_finalizado',
          produto: { ...produto },
          clienteId,
        });

        verificarFinalizacaoCarga();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          sucesso: true, 
          produto: { ...produto } 
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          sucesso: false, 
          mensagem: error.message 
        }));
      }
    });
    return;
  }

  // Endpoint SSE
  if (parsedUrl.pathname === '/sse') {
    const clientId = `CLIENTE-${carga.proximoClienteId++}`;
    console.log(`Nova conexão SSE estabelecida: ${clientId}`);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type',
    });

    // Registra o cliente
    carga.clientes.set(clientId, {
      res,
      produtosEmProcessamento: [],
    });

    // Envia estado inicial da carga
    try {
      const estadoInicial = {
        type: 'conexao_estabelecida',
        clienteId: clientId,
        carga: {
          id: carga.id,
          totalProdutos: carga.produtos.length,
          produtosDisponiveis: carga.produtos.filter(p => p.status === 'disponivel').length,
          produtosEmProcessamento: carga.produtos.filter(p => p.status === 'em_processamento').length,
          produtosFinalizados: carga.produtos.filter(p => p.status === 'finalizado').length,
        },
        clientesConectados: Array.from(carga.clientes.keys()),
        totalClientes: carga.clientes.size,
        produtos: carga.produtos.map(p => ({
          id: p.id,
          nome: p.nome,
          status: p.status,
          clienteId: p.clienteId,
        })),
      };
      res.write(`data: ${JSON.stringify(estadoInicial)}\n\n`);
    } catch (error) {
      console.error(`Erro ao enviar estado inicial para ${clientId}:`, error.message);
    }

    // Inicia simulação do segundo cliente apenas se ainda não foi iniciada
    if (!carga.intervaloSimulacao) {
      setTimeout(() => {
        simularSegundoCliente();
        // Continua simulando enquanto houver produtos disponíveis
        carga.intervaloSimulacao = setInterval(() => {
          if (carga.produtos.some(p => p.status === 'disponivel')) {
            simularSegundoCliente();
          } else {
            clearInterval(carga.intervaloSimulacao);
            carga.intervaloSimulacao = null;
          }
        }, 10000); // Aumentado para 10 segundos
      }, 2000);
    }

    req.on('close', () => {
      console.log(`Conexão SSE fechada: ${clientId}`);
      carga.clientes.delete(clientId);
    });

    req.on('error', (error) => {
      console.error(`Erro na conexão SSE do cliente ${clientId}:`, error.message);
      carga.clientes.delete(clientId);
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
  console.log(`📦 Endpoint para pegar produto: POST http://localhost:${PORT}/pegar-produto`);
  console.log(`✅ Endpoint para finalizar produto: POST http://localhost:${PORT}/finalizar-produto`);
  console.log(`🌐 Página de teste em http://localhost:${PORT}/`);
  console.log(`\n📋 Funcionalidades:`);
  console.log(`- Carga inicializada com 10 produtos`);
  console.log(`- Cliente simulado (backend) processará produtos automaticamente`);
  console.log(`- Quando todos os produtos forem finalizados, conexões SSE serão encerradas`);
  console.log(`- Carga finalizada não será reinicializada automaticamente`);
});

server.on('error', (error) => {
  console.error('Erro no servidor:', error);
});
