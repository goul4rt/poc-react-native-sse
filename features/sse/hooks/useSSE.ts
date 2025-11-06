import { useCallback, useEffect, useRef, useState } from 'react';
import EventSource, { EventSourceEvent } from 'react-native-sse';
import {
  SSEConfig,
  SSEEvent,
  SSEState,
  UseSSEOptions,
  UseSSEReturn,
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

  const eventSourceRef = useRef<EventSource | null>(null);
  const configRef = useRef(config);
  const optionsRef = useRef(options);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

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
        reconnectAttempts: reconnectAttemptsRef.current,
      };

      // Adiciona mensagem formatada ao histórico
      let messageContent = '';
      switch (event.type) {
        case 'open':
          messageContent = 'Conexão estabelecida';
          reconnectAttemptsRef.current = 0;
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

  const attemptReconnectRef = useRef<(() => void) | undefined>(undefined);

  // Função interna que realiza a conexão real
  const doConnect = useCallback(() => {
    const currentConfig = configRef.current;
    if (!currentConfig) return;

    if (isConnectingRef.current) return;

    // Valida a URL
    if (!currentConfig.url || !currentConfig.url.startsWith('http')) {
      const error = new Error('URL inválida. Deve começar com http:// ou https://');
      setState(prev => ({
        ...prev,
        status: 'error',
        isError: true,
        error,
      }));
      handleEvent({
        type: 'error',
        message: error.message,
        error,
      });
      return;
    }

    // Fecha conexão anterior se existir
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Limpa timeout de reconexão se existir
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    isConnectingRef.current = true;
    setState(prev => ({
      ...prev,
      status: prev.status === 'reconnecting' ? 'reconnecting' : 'connecting',
      isConnecting: true,
      isDisconnected: false,
    }));

    try {
      // Cria nova instância do EventSource
      const eventSource = new EventSource(currentConfig.url, {
        method: currentConfig.method,
        timeout: currentConfig.timeout,
        timeoutBeforeConnection: currentConfig.timeoutBeforeConnection,
        withCredentials: currentConfig.withCredentials,
        headers: currentConfig.headers,
        body: currentConfig.body,
        debug: currentConfig.debug,
        pollingInterval: currentConfig.pollingInterval,
        lineEndingCharacter: currentConfig.lineEndingCharacter,
      });

      eventSourceRef.current = eventSource;

      // Listener para conexão estabelecida
      const onOpen = () => {
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        handleEvent({ type: 'open' });
      };

      // Listener para mensagens
      const onMessage = (event: EventSourceEvent<'message'>) => {
        handleEvent({
          type: 'message',
          data: event.data,
          eventId: event.lastEventId || undefined,
          url: event.url,
        });
      };

      // Listener para erros
      const onError = (event: EventSourceEvent<'error'>) => {
        isConnectingRef.current = false;
        const errorMessage = (event as any).message || 
          `Erro na conexão SSE${(event as any).xhrStatus ? ` (Status: ${(event as any).xhrStatus})` : ''}`;
        
        const errorEvent: SSEEvent = {
          type: 'error',
          message: errorMessage,
          xhrState: (event as any).xhrState,
          xhrStatus: (event as any).xhrStatus,
          error: (event as any).error || new Error(errorMessage),
        };

        handleEvent(errorEvent);

        // Tenta reconectar automaticamente usando a ref
        attemptReconnectRef.current?.();
      };

      // Listener para fechamento
      const onClose = () => {
        isConnectingRef.current = false;
        handleEvent({ type: 'close' });
      };

      // Adiciona listeners
      eventSource.addEventListener('open', onOpen);
      eventSource.addEventListener('message', onMessage);
      eventSource.addEventListener('error', onError);
      eventSource.addEventListener('close', onClose);

      // Abre a conexão
      eventSource.open();

    } catch (error) {
      isConnectingRef.current = false;
      const err = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({
        ...prev,
        status: 'error',
        isError: true,
        error: err,
      }));
      
      handleEvent({
        type: 'error',
        message: err.message,
        error: err,
      });
    }
  }, [handleEvent]);

  const attemptReconnect = useCallback(() => {
    const currentConfig = configRef.current;
    if (!currentConfig) return;

    const maxAttempts = optionsRef.current.maxReconnectAttempts ?? currentConfig.maxReconnectAttempts ?? 5;
    const reconnectOnError = optionsRef.current.reconnectOnError ?? currentConfig.reconnectOnError ?? true;

    if (!reconnectOnError) return;

    if (reconnectAttemptsRef.current >= maxAttempts) {
      setState(prev => ({
        ...prev,
        status: 'error',
        isError: true,
        error: new Error(`Máximo de tentativas de reconexão atingido (${maxAttempts})`),
      }));
      return;
    }

    reconnectAttemptsRef.current++;
    const interval = optionsRef.current.reconnectInterval ?? currentConfig.reconnectInterval ?? 1000;
    const delay = interval * Math.pow(2, reconnectAttemptsRef.current - 1);

    setState(prev => ({
      ...prev,
      status: 'reconnecting',
      reconnectAttempts: reconnectAttemptsRef.current,
    }));

    reconnectTimeoutRef.current = setTimeout(() => {
      doConnect();
    }, delay);
  }, [doConnect]);

  // Atualiza a ref para evitar dependência circular
  attemptReconnectRef.current = attemptReconnect;

  const connect = useCallback(async () => {
    const currentConfig = configRef.current;
    if (!currentConfig) {
      console.warn('useSSE: Nenhuma configuração fornecida');
      return;
    }

    doConnect();
  }, [doConnect]);

  const disconnect = useCallback(() => {
    // Limpa timeout de reconexão
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Fecha conexão
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    isConnectingRef.current = false;
    reconnectAttemptsRef.current = 0;

    setState({
      status: 'disconnected',
      isConnected: false,
      isConnecting: false,
      isDisconnected: true,
      isError: false,
      reconnectAttempts: 0,
    });
  }, []);

  const reconnect = useCallback(async () => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    await connect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (config && options.enabled !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [config?.url, options.enabled]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

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
