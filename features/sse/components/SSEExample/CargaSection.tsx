import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Carga } from './types';

interface CargaSectionProps {
  carga: Carga;
}

export function CargaSection({ carga }: CargaSectionProps) {
  const progressPercentage = (carga.produtosFinalizados / carga.totalProdutos) * 100;

  return (
    <View style={styles.cargaSection}>
      <Text style={styles.label}>Carga: {carga.id}</Text>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${progressPercentage}%` }
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
  );
}

const styles = StyleSheet.create({
  cargaSection: {
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
});

