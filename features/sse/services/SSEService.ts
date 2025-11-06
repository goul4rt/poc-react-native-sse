import EventSource, { EventSourceEvent } from 'react-native-sse';
import {
  ISSEService,
  SSEConfig,
  SSEEvent,
  SSEEventCallback,
  SSEStatus,
  SSEEventType
} from '../types';

/**
 * Serviço SSE que abstrai a biblioteca react-native-sse
 * Permite fácil troca de implementação mantendo a mesma interface
 */
export class SSEService implements ISSEService {
  private eventSource?: EventSource;
  private config?: SSEConfig;
  private status: SSEStatus = 'idle';
  private eventCallbacks = new Map<SSEEventType, SSEEventCallback[]>();
  private reconnectTimeout?: ReturnType<typeof setTimeout>;
  private reconnectAttempts = 0;

  constructor() {}

 
  async connect(config: SSEConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.config = config;
        this.status = 'connecting';

        // Fecha conexão anterior se existir
        if (this.eventSource) {
          this.disconnect();
        }

        // Valida a URL
        if (!config.url || !config.url.startsWith('http')) {
          const error = new Error('URL inválida. Deve começar com http:// ou https://');
          this.status = 'error';
          this.notifyEvent('error', {
            type: 'error',
            message: error.message,
            error,
          });
          reject(error);
          return;
        }

        // Cria nova instância do EventSource
        this.eventSource = new EventSource(config.url, {
          method: config.method,
          timeout: config.timeout,
          timeoutBeforeConnection: config.timeoutBeforeConnection,
          withCredentials: config.withCredentials,
          headers: config.headers,
          body: config.body,
          debug: config.debug,
          pollingInterval: config.pollingInterval,
          lineEndingCharacter: config.lineEndingCharacter,
        });

        // Aguarda a conexão ser estabelecida ou falhar
        let connectionResolved = false;
        const timeout = setTimeout(() => {
          if (!connectionResolved) {
            connectionResolved = true;
            const error = new Error('Timeout ao conectar ao servidor SSE');
            this.status = 'error';
            this.notifyEvent('error', {
              type: 'error',
              message: error.message,
              error,
            });
            reject(error);
          }
        }, config.timeoutBeforeConnection || 10000);

        // Listener temporário para o evento 'open' (declarado primeiro)
        const onOpen = () => {
          if (!connectionResolved) {
            connectionResolved = true;
            clearTimeout(timeout);
            this.eventSource?.removeEventListener('open', onOpen);
            this.eventSource?.removeEventListener('error', onError);
            // Agora que a conexão foi estabelecida, configura os listeners permanentes
            this.setupEventListeners();
            resolve();
          }
        };

        // Listener temporário para o evento 'error' inicial
        const onError = (event: EventSourceEvent<'error'>) => {
          if (!connectionResolved) {
            connectionResolved = true;
            clearTimeout(timeout);
            this.eventSource?.removeEventListener('open', onOpen);
            this.eventSource?.removeEventListener('error', onError);
            const error = new Error(
              (event as any).message || 
              `Erro ao conectar: ${(event as any).xhrStatus || 'Conexão falhou'}`
            );
            this.status = 'error';
            this.notifyEvent('error', {
              type: 'error',
              message: error.message,
              xhrState: (event as any).xhrState,
              xhrStatus: (event as any).xhrStatus,
              error,
            });
            reject(error);
          }
        };

        // Adiciona listeners temporários primeiro (antes dos permanentes)
        this.eventSource.addEventListener('open', onOpen);
        this.eventSource.addEventListener('error', onError);

        // Tenta abrir a conexão
        this.eventSource.open();

      } catch (error) {
        this.status = 'error';
        const err = error instanceof Error ? error : new Error(String(error));
        this.notifyEvent('error', {
          type: 'error',
          message: err.message,
          error: err,
        });
        reject(err);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }

    this.status = 'disconnected';
    this.reconnectAttempts = 0;
  }

  async reconnect(): Promise<void> {
    if (!this.config) {
      throw new Error('Nenhuma configuração SSE encontrada para reconectar');
    }

    const maxAttempts = this.config.maxReconnectAttempts || 5;
    const interval = this.config.reconnectInterval || 1000;

    if (this.reconnectAttempts >= maxAttempts) {
      this.status = 'error';
      this.notifyEvent('error', {
        type: 'error',
        message: `Máximo de tentativas de reconexão atingido (${maxAttempts})`,
        error: new Error('Max reconnection attempts reached'),
      });
      return;
    }

    this.reconnectAttempts++;
    this.status = 'reconnecting';

    // Aguarda um intervalo exponencial antes de tentar reconectar
    const delay = interval * Math.pow(2, this.reconnectAttempts - 1);

    await new Promise<void>(resolve => {
      this.reconnectTimeout = setTimeout(() => resolve(), delay);
    });

    try {
      await this.connect(this.config);
    } catch (error) {
      // Se falhar, tenta novamente
      if (this.config.reconnectOnError !== false) {
        this.reconnect();
      }
    }
  }

  on(event: SSEEventType, callback: SSEEventCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  off(event: SSEEventType, callback?: SSEEventCallback): void {
    if (!callback) {
      this.eventCallbacks.delete(event);
      return;
    }

    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        if (callbacks.length === 0) {
          this.eventCallbacks.delete(event);
        }
      }
    }
  }

  getStatus(): SSEStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === 'connected';
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.addEventListener('open', () => {
      this.status = 'connected';
      this.reconnectAttempts = 0;
      this.notifyEvent('open', { type: 'open' });
    });

    this.eventSource.addEventListener('message', (event: EventSourceEvent<'message'>) => {
      this.notifyEvent('message', {
        type: 'message',
        data: event.data,
        eventId: event.lastEventId || undefined,
        url: event.url,
      });
    });

    this.eventSource.addEventListener('error', (event: EventSourceEvent<'error'>) => {
      // Só trata erros após a conexão inicial ser estabelecida
      // Erros durante a conexão inicial são tratados no método connect()
      if (this.status === 'connected') {
        this.status = 'error';
        const errorMessage = (event as any).message || 
          `Erro na conexão SSE${(event as any).xhrStatus ? ` (Status: ${(event as any).xhrStatus})` : ''}`;
        
        this.notifyEvent('error', {
          type: 'error',
          message: errorMessage,
          xhrState: (event as any).xhrState,
          xhrStatus: (event as any).xhrStatus,
          error: (event as any).error || new Error(errorMessage),
        });

        if (this.config?.reconnectOnError !== false) {
          this.reconnect();
        }
      }
    });

    this.eventSource.addEventListener('close', () => {
      this.status = 'disconnected';
      this.notifyEvent('close', { type: 'close' });
    });

  }

  private notifyEvent(eventType: SSEEventType, event: SSEEvent): void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Erro no callback SSE para evento ${eventType}:`, error);
        }
      });
    }
  }
}
