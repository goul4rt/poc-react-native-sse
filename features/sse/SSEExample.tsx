import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSSE } from './hooks';
import { SSEConfig } from './types';
import { getDefaultSSEUrl, getBaseUrl } from './components/SSEExample/utils';
import { Produto, Carga } from './components/SSEExample/types';
import { Header } from './components/SSEExample/Header';
import { StatusSection } from './components/SSEExample/StatusSection';
import { CargaSection } from './components/SSEExample/CargaSection';
import { ClientesSection } from './components/SSEExample/ClientesSection';
import { ProdutosSection } from './components/SSEExample/ProdutosSection';
import { ProdutoAtualSection } from './components/SSEExample/ProdutoAtualSection';
import { FinalizacaoSection } from './components/SSEExample/FinalizacaoSection';
import { ControlsSection } from './components/SSEExample/ControlsSection';
import { ErrorSection } from './components/SSEExample/ErrorSection';
import { MessagesSection } from './components/SSEExample/MessagesSection';

export function SSEExample() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [carga, setCarga] = useState<Carga | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoAtual, setProdutoAtual] = useState<Produto | null>(null);
  const [cargaFinalizada, setCargaFinalizada] = useState(false);
  const [mensagemFinalizacao, setMensagemFinalizacao] = useState<string | null>(null);
  const [clientesConectados, setClientesConectados] = useState<string[]>([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const processamentoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseUrl = getBaseUrl();
  const url = getDefaultSSEUrl();

  const sseConfig: SSEConfig | null = isEnabled ? {
    url,
    reconnectOnError: false,
    reconnectInterval: 1000,
    maxReconnectAttempts: 0,
    debug: true,
  } : null;

  const {
    state,
    connect,
    disconnect,
    reconnect,
    isConnected,
    isConnecting,
    isError,
    error,
    messages,
  } = useSSE(sseConfig, {
    enabled: isEnabled,
    maxMessages: 100,
    onMessage: (event) => {
      if (event.data) {
        try {
          const data = JSON.parse(event.data);
          handleSSEEvent(data);
        } catch (e) {
          console.log('Evento SSE não-JSON:', event.data);
        }
      }
    },
    onOpen: (event) => {
      console.log('Conexão SSE aberta:', event);
    },
    onError: (event) => {
      console.error('Erro SSE:', event);
    },
    onClose: (event) => {
      console.log('Conexão SSE fechada:', event);
      if (cargaFinalizada) {
        Alert.alert(
          'Carga Finalizada',
          mensagemFinalizacao || 'Todos os produtos foram finalizados.',
          [{ text: 'OK' }]
        );
      }
    },
  });

  const handleSSEEvent = (data: any) => {
    if (data.clientesConectados) {
      setClientesConectados(data.clientesConectados);
      setTotalClientes(data.totalClientes || 0);
    }

    switch (data.type) {
      case 'conexao_estabelecida':
        setClienteId(data.clienteId);
        setCarga(data.carga);
        setProdutos(data.produtos || []);
        if (data.clientesConectados) {
          setClientesConectados(data.clientesConectados);
          setTotalClientes(data.totalClientes || 0);
        }
        break;
      
      case 'produto_pegue':
        setProdutos(prev => {
          const novosProdutos = prev.map(p => 
            p.id === data.produto.id ? data.produto : p
          );
          atualizarEstatisticasCarga(novosProdutos);
          return novosProdutos;
        });
        if (data.clienteId === clienteId) {
          setProdutoAtual(data.produto);
        }
        break;
      
      case 'produto_finalizado':
        setProdutos(prev => {
          const novosProdutos = prev.map(p => 
            p.id === data.produto.id ? data.produto : p
          );
          atualizarEstatisticasCarga(novosProdutos);
          return novosProdutos;
        });
        if (data.produto.clienteId === clienteId && produtoAtual?.id === data.produto.id) {
          setProdutoAtual(null);
        }
        break;
      
      case 'carga_finalizada':
        setCargaFinalizada(true);
        setMensagemFinalizacao(data.mensagem);
        if (produtoAtual) {
          setProdutoAtual(null);
        }
        break;
    }
  };

  const atualizarEstatisticasCarga = (produtosAtuais: Produto[]) => {
    setCarga(prevCarga => {
      if (!prevCarga) return prevCarga;
      return {
        ...prevCarga,
        produtosDisponiveis: produtosAtuais.filter(p => p.status === 'disponivel').length,
        produtosEmProcessamento: produtosAtuais.filter(p => p.status === 'em_processamento').length,
        produtosFinalizados: produtosAtuais.filter(p => p.status === 'finalizado').length,
      };
    });
  };

  const pegarProduto = async () => {
    if (!clienteId) {
      Alert.alert('Erro', 'Cliente ID não disponível');
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/pegar-produto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clienteId }),
      });

      const result = await response.json();
      
      if (result.sucesso) {
        setProdutoAtual(result.produto);
        setProdutos(prev => {
          const novosProdutos = prev.map(p => 
            p.id === result.produto.id ? result.produto : p
          );
          atualizarEstatisticasCarga(novosProdutos);
          return novosProdutos;
        });
        const tempoProcessamento = 8000 + Math.random() * 4000;
        processamentoTimeoutRef.current = setTimeout(() => {
          finalizarProduto(result.produto.id);
        }, tempoProcessamento);
      } else {
        Alert.alert('Aviso', result.mensagem);
      }
    } catch (error) {
      Alert.alert('Erro', `Erro ao pegar produto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const finalizarProduto = async (produtoId: string) => {
    if (!clienteId) return;

    try {
      const response = await fetch(`${baseUrl}/finalizar-produto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clienteId, produtoId }),
      });

      const result = await response.json();
      
      if (result.sucesso) {
        setProdutoAtual(null);
        setProdutos(prev => {
          const novosProdutos = prev.map(p => 
            p.id === result.produto.id ? result.produto : p
          );
          atualizarEstatisticasCarga(novosProdutos);
          return novosProdutos;
        });
        if (processamentoTimeoutRef.current) {
          clearTimeout(processamentoTimeoutRef.current);
          processamentoTimeoutRef.current = null;
        }
      } else {
        Alert.alert('Erro', result.mensagem);
      }
    } catch (error) {
      Alert.alert('Erro', `Erro ao finalizar produto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleConnect = () => {
    setIsEnabled(true);
    setCargaFinalizada(false);
    setMensagemFinalizacao(null);
    setProdutoAtual(null);
  };

  const handleDisconnect = () => {
    setIsEnabled(false);
    disconnect();
    setClienteId(null);
    setCarga(null);
    setProdutos([]);
    setProdutoAtual(null);
    setCargaFinalizada(false);
    setMensagemFinalizacao(null);
    setClientesConectados([]);
    setTotalClientes(0);
    if (processamentoTimeoutRef.current) {
      clearTimeout(processamentoTimeoutRef.current);
      processamentoTimeoutRef.current = null;
    }
  };

  const handleReconnect = () => {
    reconnect();
  };

  useEffect(() => {
    return () => {
      if (processamentoTimeoutRef.current) {
        clearTimeout(processamentoTimeoutRef.current);
      }
    };
  }, []);

  const produtosDisponiveis = produtos.filter(p => p.status === 'disponivel');
  const podePegarProduto = isConnected && !produtoAtual && produtosDisponiveis.length > 0 && !cargaFinalizada;

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView style={styles.scrollContent}>
        <StatusSection
          state={state}
          clienteId={clienteId}
          isConnected={isConnected}
          isConnecting={isConnecting}
          isError={isError}
        />

        {carga && <CargaSection carga={carga} />}

        <ClientesSection
          clientesConectados={clientesConectados}
          totalClientes={totalClientes}
          clienteId={clienteId}
        />

        <ProdutosSection
          produtos={produtos}
          carga={carga}
          clienteId={clienteId}
        />

        {produtoAtual && <ProdutoAtualSection produto={produtoAtual} />}

        {cargaFinalizada && <FinalizacaoSection mensagem={mensagemFinalizacao} />}

        <ControlsSection
          isEnabled={isEnabled}
          podePegarProduto={podePegarProduto}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onReconnect={handleReconnect}
          onPegarProduto={pegarProduto}
        />

        {error && <ErrorSection error={error} />}

        <MessagesSection messages={messages} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
});

