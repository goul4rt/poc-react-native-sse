import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface ClientesSectionProps {
  clientesConectados: string[];
  totalClientes: number;
  clienteId: string | null;
}

export function ClientesSection({ clientesConectados, totalClientes, clienteId }: ClientesSectionProps) {
  if (totalClientes === 0) {
    return null;
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  clientesSection: {
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
});

