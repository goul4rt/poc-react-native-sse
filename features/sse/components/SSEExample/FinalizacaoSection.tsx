import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface FinalizacaoSectionProps {
  mensagem: string | null;
}

export function FinalizacaoSection({ mensagem }: FinalizacaoSectionProps) {
  return (
    <View style={styles.finalizacaoSection}>
      <Text style={styles.finalizacaoTitle}>🎉 Carga Finalizada!</Text>
      <Text style={styles.finalizacaoText}>{mensagem}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});

