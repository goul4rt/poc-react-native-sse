import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Produto, Carga } from './types';
import { ProdutoItem } from './ProdutoItem';

interface ProdutosSectionProps {
  produtos: Produto[];
  carga: Carga | null;
  clienteId: string | null;
}

export function ProdutosSection({ produtos, carga, clienteId }: ProdutosSectionProps) {
  if (produtos.length === 0) {
    return null;
  }

  return (
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
        {produtos.map((produto) => (
          <ProdutoItem key={produto.id} produto={produto} clienteId={clienteId} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  produtosSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  produtosHeader: {
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
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
});

