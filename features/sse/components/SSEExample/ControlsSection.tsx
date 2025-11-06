import React from 'react';
import { View, Button, StyleSheet } from 'react-native';

interface ControlsSectionProps {
  isEnabled: boolean;
  podePegarProduto: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onReconnect: () => void;
  onPegarProduto: () => void;
}

export function ControlsSection({
  isEnabled,
  podePegarProduto,
  onConnect,
  onDisconnect,
  onReconnect,
  onPegarProduto,
}: ControlsSectionProps) {
  return (
    <View style={styles.controlsSection}>
      {!isEnabled ? (
        <Button title="Conectar" onPress={onConnect} color="#4CAF50" />
      ) : (
        <>
          <View style={styles.buttonRow}>
            <Button title="Desconectar" onPress={onDisconnect} color="#F44336" />
            <Button title="Reconectar" onPress={onReconnect} color="#FF9800" />
          </View>
          {podePegarProduto && (
            <View style={styles.buttonRow}>
              <Button title="Pegar Produto" onPress={onPegarProduto} color="#2196F3" />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controlsSection: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});

