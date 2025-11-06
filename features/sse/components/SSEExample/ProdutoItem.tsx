import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Produto } from './types';

interface ProdutoItemProps {
  produto: Produto;
  clienteId: string | null;
}

export function ProdutoItem({ produto, clienteId }: ProdutoItemProps) {
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
    <View style={styles.produtoItem}>
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
}

const styles = StyleSheet.create({
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
  produtoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
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
});

