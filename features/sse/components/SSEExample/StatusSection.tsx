import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SSEState } from '../../types';

interface StatusSectionProps {
  state: SSEState;
  clienteId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isError: boolean;
}

export function StatusSection({ state, clienteId, isConnected, isConnecting, isError }: StatusSectionProps) {
  const getStatusColor = () => {
    if (isConnected) return '#4CAF50';
    if (isConnecting) return '#FF9800';
    if (isError) return '#F44336';
    return '#9E9E9E';
  };

  const getStatusText = () => {
    if (state.status === 'idle') return 'Inativo';
    if (state.status === 'connecting') return 'Conectando...';
    if (state.status === 'connected') return 'Conectado';
    if (state.status === 'disconnected') return 'Desconectado';
    if (state.status === 'error') return 'Erro';
    if (state.status === 'reconnecting') return `Reconectando (${state.reconnectAttempts})`;
    return 'Desconhecido';
  };

  return (
    <View style={styles.statusSection}>
      <Text style={styles.label}>Status da Conexão:</Text>
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>
      {clienteId && (
        <Text style={styles.clienteId}>Cliente ID: {clienteId}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statusSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
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
});

