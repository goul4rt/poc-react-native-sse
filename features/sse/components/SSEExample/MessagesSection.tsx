import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { SSEMessage } from '../../types';

interface MessagesSectionProps {
  messages: SSEMessage[];
}

export function MessagesSection({ messages }: MessagesSectionProps) {
  return (
    <View style={styles.messagesSection}>
      <Text style={styles.label}>Log de Eventos ({messages.length}):</Text>
      <ScrollView style={styles.messagesScroll} nestedScrollEnabled>
        {messages.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum evento recebido ainda</Text>
        ) : (
          messages.slice().reverse().map((message) => (
            <Text key={message.id} style={styles.messageText}>
              {message.timestamp.toLocaleTimeString()}: {message.content}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  messagesSection: {
    marginBottom: 16,
    minHeight: 200,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  messagesScroll: {
    maxHeight: Dimensions.get('window').height * 0.7,
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
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});

