import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, Platform } from 'react-native';
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

export function SSEExample() {
  // No React Native, localhost se refere ao dispositivo/emulador
  // Para conectar à máquina de desenvolvimento, use o IP da máquina na rede local
  // Exemplo: http://192.168.1.100:3005/sse
  // Para iOS Simulator no macOS, pode usar localhost
  // Para Android Emulator, use 10.0.2.2 para referenciar localhost da máquina host
  const [url, setUrl] = useState(getDefaultSSEUrl());
  const [isEnabled, setIsEnabled] = useState(false);

  const sseConfig: SSEConfig | null = isEnabled ? {
    url,
    reconnectOnError: true,
    reconnectInterval: 1000,
    maxReconnectAttempts: 5,
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
    maxMessages: 50,
    onMessage: (event) => {
      console.log('Nova mensagem SSE:', event);
    },
    onOpen: (event) => {
      console.log('Conexão SSE aberta:', event);
    },
    onError: (event) => {
      console.error('Erro SSE:', event);
    },
    onClose: (event) => {
      console.log('Conexão SSE fechada:', event);
    },
  });

  const handleConnect = () => {
    setIsEnabled(true);
  };

  const handleDisconnect = () => {
    setIsEnabled(false);
    disconnect();
  };

  const handleReconnect = () => {
    reconnect();
  };

  const getStatusColor = () => {
    if (isConnected) return '#4CAF50';
    if (isConnecting) return '#FF9800';
    if (isError) return '#F44336';
    return '#9E9E9E';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SSE Example</Text>

      <View style={styles.configSection}>
        <Text style={styles.label}>URL do servidor SSE:</Text>
        <Text style={styles.helpText}>
          {Platform.OS === 'android' 
            ? 'Android: Use 10.0.2.2 para emulador ou IP da máquina para dispositivo físico'
            : 'iOS: Use localhost para simulador ou IP da máquina para dispositivo físico'}
        </Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder={getDefaultSSEUrl()}
          editable={!isEnabled}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.statusSection}>
        <Text style={styles.label}>Status:</Text>
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
      </View>

      <View style={styles.controlsSection}>
        {!isEnabled ? (
          <Button title="Conectar" onPress={handleConnect} color="#4CAF50" />
        ) : (
          <>
            <View style={styles.buttonRow}>
              <Button title="Desconectar" onPress={handleDisconnect} color="#F44336" />
              <Button title="Reconectar" onPress={handleReconnect} color="#FF9800" />
            </View>
          </>
        )}
        <Button title="Limpar Mensagens" onPress={clearMessages} color="#9C27B0" />
      </View>

      {lastEvent && (
        <View style={styles.lastEventSection}>
          <Text style={styles.label}>Último evento:</Text>
          <Text style={styles.lastEventText}>
            Tipo: {lastEvent.type}
            {lastEvent.data && `\nDados: ${lastEvent.data}`}
            {lastEvent.message && `\nMensagem: ${lastEvent.message}`}
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorSection}>
          <Text style={styles.errorLabel}>Erro:</Text>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      <View style={styles.messagesSection}>
        <Text style={styles.label}>Mensagens ({messages.length}):</Text>
        <ScrollView style={styles.messagesScroll}>
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma mensagem recebida ainda</Text>
          ) : (
            messages.map((message) => (
              <Text key={message.id} style={styles.messageText}>
                {message.timestamp.toLocaleTimeString()}: {message.content}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  configSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  statusSection: {
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  controlsSection: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lastEventSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  lastEventText: {
    fontSize: 14,
    color: '#1565c0',
    fontFamily: 'monospace',
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
  messagesSection: {
    flex: 1,
    marginBottom: 16,
  },
  messagesScroll: {
    flex: 1,
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
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
