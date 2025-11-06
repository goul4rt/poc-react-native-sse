import { useCallback, useEffect, useRef, useState } from 'react';
import { SSEService } from '../services';
import {
  SSEConfig,
  SSEEvent,
  SSEState,
  UseSSEOptions,
  UseSSEReturn,
  SSEEventType,
  SSEMessage
} from '../types';

export function useSSE(
  config: SSEConfig | null,
  options: UseSSEOptions = {}
): UseSSEReturn {
  const [state, setState] = useState<SSEState>({
    status: 'idle',
    isConnected: false,
    isConnecting: false,
    isDisconnected: true,
    isError: false,
    reconnectAttempts: 0,
  });

  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const messageIdCounter = useRef(0);
  const maxMessages = options.maxMessages ?? 50;

  const serviceRef = useRef<SSEService | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const addMessage = useCallback((event: SSEEvent, content: string) => {
    const message: SSEMessage = {
      id: `msg-${++messageIdCounter.current}`,
      timestamp: new Date(),
      type: event.type,
      content,
      event,
    };

    setMessages(prev => {
      const newMessages = [...prev, message];
      return newMessages.slice(-maxMessages);
    });
  }, [maxMessages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const handleEvent = useCallback((event: SSEEvent) => {
    setState(prevState => {
      const newState: SSEState = {
        ...prevState,
        lastEvent: event,
        status: event.type === 'open' ? 'connected' :
                event.type === 'close' ? 'disconnected' :
                event.type === 'error' ? 'error' : prevState.status,
        isConnected: event.type === 'open',
        isConnecting: event.type === 'open' ? false : prevState.isConnecting,
        isDisconnected: event.type === 'close',
        isError: event.type === 'error',
        error: event.type === 'error' ? event.error : undefined,
      };

      // Adiciona mensagem formatada ao histórico
      let messageContent = '';
      switch (event.type) {
        case 'open':
          messageContent = 'Conexão estabelecida';
          optionsRef.current.onOpen?.(event);
          break;
        case 'message':
          // Tenta fazer parse de JSON se possível
          if (event.data) {
            try {
              const parsed = JSON.parse(event.data);
              // Se for um objeto JSON, formata de forma legível
              if (typeof parsed === 'object' && parsed !== null) {
                messageContent = JSON.stringify(parsed, null, 2);
              } else {
                messageContent = event.data;
              }
            } catch {
              // Se não for JSON válido, usa o dado original
              messageContent = event.data;
            }
          } else {
            messageContent = 'Mensagem vazia';
          }
          optionsRef.current.onMessage?.(event);
          break;
        case 'error':
          messageContent = `Erro - ${event.message || event.error?.message || 'Erro desconhecido'}`;
          optionsRef.current.onError?.(event);
          break;
        case 'close':
          messageContent = 'Conexão fechada';
          optionsRef.current.onClose?.(event);
          break;
        case 'timeout':
          messageContent = 'Timeout na conexão';
          break;
        case 'exception':
          messageContent = `Exceção - ${event.message || 'Exceção desconhecida'}`;
          break;
      }

      if (messageContent) {
        addMessage(event, messageContent);
      }

      return newState;
    });
  }, [addMessage]);

  const connect = useCallback(async () => {
    if (!config) {
      console.warn('useSSE: Nenhuma configuração fornecida');
      return;
    }

    if (!serviceRef.current) {
      serviceRef.current = new SSEService();
    }

    const service = serviceRef.current!;

    service.on('open', handleEvent);
    service.on('message', handleEvent);
    service.on('error', handleEvent);
    service.on('close', handleEvent);
    service.on('timeout', handleEvent);
    service.on('exception', handleEvent);

    try {
      setState(prev => ({
        ...prev,
        status: 'connecting',
        isConnecting: true,
        isDisconnected: false,
      }));

      await service.connect(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('useSSE: Erro ao conectar:', errorMessage, error);
      
      setState(prev => ({
        ...prev,
        status: 'error',
        isError: true,
        isConnecting: false,
        error: error instanceof Error ? error : new Error(errorMessage),
      }));
      
      // Notifica o callback de erro se existir
      optionsRef.current.onError?.({
        type: 'error',
        message: errorMessage,
        error: error instanceof Error ? error : new Error(errorMessage),
      });
    }
  }, [config, handleEvent]);

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current!.disconnect();

      serviceRef.current!.off('open', handleEvent);
      serviceRef.current!.off('message', handleEvent);
      serviceRef.current!.off('error', handleEvent);
      serviceRef.current!.off('close', handleEvent);
      serviceRef.current!.off('timeout', handleEvent);
      serviceRef.current!.off('exception', handleEvent);
    }

    setState({
      status: 'disconnected',
      isConnected: false,
      isConnecting: false,
      isDisconnected: true,
      isError: false,
      reconnectAttempts: 0,
    });
  }, [handleEvent]);

  const reconnect = useCallback(async () => {
    if (!serviceRef.current || !config) {
      await connect();
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        status: 'reconnecting',
        reconnectAttempts: prev.reconnectAttempts + 1,
      }));

      await serviceRef.current!.reconnect();
    } catch (error) {
      console.error('useSSE: Erro ao reconectar:', error);
    }
  }, [config, connect]);

  useEffect(() => {
    if (config && options.enabled !== false) {
      connect();
    }

    return () => {
      if (options.enabled !== false) {
        disconnect();
      }
    };
  }, [config?.url, options.enabled, connect, disconnect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const isConnected = state.status === 'connected';
  const isConnecting = state.status === 'connecting' || state.status === 'reconnecting';
  const isDisconnected = state.status === 'disconnected' || state.status === 'idle';
  const isError = state.status === 'error';

  return {
    state,
    connect,
    disconnect,
    reconnect,
    isConnected,
    isConnecting,
    isDisconnected,
    isError,
    lastEvent: state.lastEvent,
    error: state.error,
    messages,
    clearMessages,
  };
}
