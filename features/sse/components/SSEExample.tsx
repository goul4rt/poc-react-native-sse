import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Platform, Alert, Dimensions } from 'react-native';
import { useSSE } from '../hooks';
import { SSEConfig } from '../types';

/**
 * Retorna a URL padrão baseada na plataforma
 * - Android Emulator: 10.0.2.2 (mapeia para localhost da máquina host)
 * - iOS Simulator: localhost (funciona diretamente)
 * - Dispositivo físico: precisa do IP da máquina na rede local
 */
function getDefaultSSEUrl(): string {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3005/sse';
  } else if (Platform.OS === 'ios') {
    return 'http://localhost:3005/sse';
  }
  return 'http://localhost:3005/sse';
}

function getBaseUrl(): string {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3005';
  } else if (Platform.OS === 'ios') {
    return 'http://localhost:3005';
  }
  return 'http://localhost:3005';
}

interface Produto {
  id: string;
  nome: string;
  status: 'disponivel' | 'em_processamento' | 'finalizado';
  clienteId: string | null;
  finalizadoEm?: string;
}

interface Carga {
  id: string;
  totalProdutos: number;
  produtosDisponiveis: number;
  produtosEmProcessamento: number;
  produtosFinalizados: number;
}

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
    reconnectOnError: false, // Não reconecta automaticamente quando carga finaliza
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
    lastEvent,
    error,
    messages,
    clearMessages,
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
    // Atualiza informações de clientes em todos os eventos
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
        // Atualiza o produto na lista
        setProdutos(prev => {
          const novosProdutos = prev.map(p => 
            p.id === result.produto.id ? result.produto : p
          );
          atualizarEstatisticasCarga(novosProdutos);
          return novosProdutos;
        });
        // Simula processamento por 8-12 segundos
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
        // Atualiza o produto na lista
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

  const getStatusColor = () => {
    if (isConnected) return '#4CAF50';
    if (isConnecting) return '#FF9800';
    if (isError) return '#F44336';
    return '#9E9E9E';
  };

  const produtosDisponiveis = produtos.filter(p => p.status === 'disponivel');
  const podePegarProduto = isConnected && !produtoAtual && produtosDisponiveis.length > 0 && !cargaFinalizada;
  return (
    <View style={styles.container}>
      {/* Header fixo com informações principais */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Distribuição de Carga</Text>
    
      </View>

      <ScrollView style={styles.scrollContent}>
      <View style={styles.statusSection}>
        <Text style={styles.label}>Status da Conexão:</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>
            {state.status === 'idle' && 'Inativo'}
            {state.status === 'connecting' && 'Conectando...'}
            {state.status === 'connected' && 'Conectado'}
            {state.status === 'disconnected' && 'Desconectado'}
            {state.status === 'error' && 'Erro'}
            {state.status === 'reconnecting' && `Reconectando (${state.reconnectAttempts})`}
          </Text>
        </View>
        {clienteId && (
          <Text style={styles.clienteId}>Cliente ID: {clienteId}</Text>
        )}
      </View>

      {carga && (
        <View style={styles.cargaSection}>
          <Text style={styles.label}>Carga: {carga.id}</Text>
          
          {/* Barra de progresso */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(carga.produtosFinalizados / carga.totalProdutos) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {carga.produtosFinalizados} de {carga.totalProdutos} produtos finalizados
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{carga.totalProdutos}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>{carga.produtosDisponiveis}</Text>
              <Text style={styles.statLabel}>Faltam</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FF9800' }]}>{carga.produtosEmProcessamento}</Text>
              <Text style={styles.statLabel}>Sendo Conferidos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#2196F3' }]}>{carga.produtosFinalizados}</Text>
              <Text style={styles.statLabel}>Concluídos</Text>
            </View>
          </View>
        </View>
      )}

      {totalClientes > 0 && (
        <View style={styles.clientesSection}>
          <Text style={styles.label}>Clientes Conectados: {totalClientes}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientesList}>
            {clientesConectados.map((id) => (
              <View key={id} style={styles.clienteBadge}>
                <Text style={styles.clienteBadgeText}>
                  {id === clienteId ? '👤 ' : ''}{id}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {produtos.length > 0 && (
        <View style={styles.produtosSection}>
          <View style={styles.produtosHeader}>
            <Text style={styles.label}>Produtos ({produtos.length}):</Text>
            {carga && (
              <View style={styles.produtosSummary}>
                <Text style={styles.summaryText}>
                  Faltam: {carga.produtosDisponiveis} | 
                  Sendo Conferidos: {carga.produtosEmProcessamento} | 
                  Concluídos: {carga.produtosFinalizados}/{carga.totalProdutos}
                </Text>
              </View>
            )}
          </View>
          <ScrollView style={styles.produtosList} nestedScrollEnabled>
            {produtos.map((produto) => {
              const getStatusColor = () => {
                if (produto.status === 'disponivel') return '#4CAF50';
                if (produto.status === 'em_processamento') return '#FF9800';
                return '#2196F3';
              };
              
              const getStatusText = () => {
                if (produto.status === 'disponivel') return 'Disponível';
                if (produto.status === 'em_processamento') return 'Sendo Conferido';
                return 'Concluído';
              };

              return (
                <View key={produto.id} style={styles.produtoItem}>
                  <View style={styles.produtoHeader}>
                    <Text style={styles.produtoNome}>{produto.nome}</Text>
                    <View style={[styles.produtoStatusBadge, { backgroundColor: getStatusColor() }]}>
                      <Text style={styles.produtoStatusText}>{getStatusText()}</Text>
                    </View>
                  </View>
                  <Text style={styles.produtoId}>ID: {produto.id}</Text>
                  {produto.clienteId && (
                    <Text style={styles.produtoCliente}>
                      Cliente: {produto.clienteId === clienteId ? '👤 ' : ''}{produto.clienteId}
                    </Text>
                  )}
                  {produto.finalizadoEm && (
                    <Text style={styles.produtoFinalizado}>
                      Finalizado em: {new Date(produto.finalizadoEm).toLocaleTimeString()}
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {produtoAtual && (
        <View style={styles.produtoAtualSection}>
          <Text style={styles.label}>Produto Sendo Conferido:</Text>
          <Text style={styles.produtoNome}>{produtoAtual.nome} ({produtoAtual.id})</Text>
          <Text style={styles.produtoStatus}>Status: Sendo Conferido</Text>
        </View>
      )}

      {cargaFinalizada && (
        <View style={styles.finalizacaoSection}>
          <Text style={styles.finalizacaoTitle}>🎉 Carga Finalizada!</Text>
          <Text style={styles.finalizacaoText}>{mensagemFinalizacao}</Text>
        </View>
      )}

      <View style={styles.controlsSection}>
        {!isEnabled ? (
          <Button title="Conectar" onPress={handleConnect} color="#4CAF50" />
        ) : (
          <>
            <View style={styles.buttonRow}>
              <Button title="Desconectar" onPress={handleDisconnect} color="#F44336" />
              <Button title="Reconectar" onPress={handleReconnect} color="#FF9800" />
            </View>
            {podePegarProduto && (
              <View style={styles.buttonRow}>
                <Button title="Pegar Produto" onPress={pegarProduto} color="#2196F3" />
              </View>
            )}
          </>
        )}
      </View>

      {error && (
        <View style={styles.errorSection}>
          <Text style={styles.errorLabel}>Erro:</Text>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      <View style={styles.messagesSection}>
        <Text style={styles.label}>Log de Eventos ({messages.length}):</Text>
        <ScrollView style={styles.messagesScroll} nestedScrollEnabled>
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum evento recebido ainda</Text>
          ) : (
            messages.slice().reverse().map((message) => (
              <Text key={message.id} style={styles.messageText}>
                {message.timestamp.toLocaleTimeString()}: {message.content}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#333',
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  headerStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  headerStatValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  headerStatLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  headerProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerProgressBar: {
    flex: 1,
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  headerProgressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  headerProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
    minWidth: 50,
    textAlign: 'right',
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  statusSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
  },
  clienteId: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  cargaSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  progressContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  progressBar: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 10,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  produtoAtualSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginTop: 4,
  },
  produtoStatus: {
    fontSize: 14,
    color: '#856404',
    marginTop: 4,
  },
  finalizacaoSection: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#d4edda',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  finalizacaoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 8,
    textAlign: 'center',
  },
  finalizacaoText: {
    fontSize: 14,
    color: '#155724',
    textAlign: 'center',
  },
  controlsSection: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  errorSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  errorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#c62828',
  },
  clientesSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  clientesList: {
    marginTop: 8,
  },
  clienteBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  clienteBadgeText: {
    fontSize: 12,
    color: '#1565c0',
    fontWeight: '600',
  },
  produtosSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  produtosHeader: {
    marginBottom: 8,
  },
  produtosSummary: {
    marginTop: 4,
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565c0',
  },
  produtosList: {
    maxHeight: Dimensions.get('window').height * 0.4,
    marginTop: 8,
  },
  produtoItem: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  produtoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  produtoStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  produtoStatusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  produtoId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  produtoCliente: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  produtoFinalizado: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  messagesSection: {
    marginBottom: 16,
    minHeight: 200,
  },
  messagesScroll: {
    maxHeight: Dimensions.get('window').height * 0.7,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  messageText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
