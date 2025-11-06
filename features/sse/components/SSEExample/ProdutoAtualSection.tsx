import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Produto } from './types';

interface ProdutoAtualSectionProps {
  produto: Produto;
}

export function ProdutoAtualSection({ produto }: ProdutoAtualSectionProps) {
  return (
    <View style={styles.produtoAtualSection}>
      <Text style={styles.label}>Produto Sendo Conferido:</Text>
      <Text style={styles.produtoNome}>{produto.nome} ({produto.id})</Text>
      <Text style={styles.produtoStatus}>Status: Sendo Conferido</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  produtoAtualSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
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
});

