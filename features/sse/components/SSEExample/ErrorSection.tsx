import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ErrorSectionProps {
  error: Error;
}

export function ErrorSection({ error }: ErrorSectionProps) {
  return (
    <View style={styles.errorSection}>
      <Text style={styles.errorLabel}>Erro:</Text>
      <Text style={styles.errorText}>{error.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});

