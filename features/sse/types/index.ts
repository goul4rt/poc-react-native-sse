import { EventSourceEvent, EventSourceOptions } from 'react-native-sse';

export type SSEEventType = 'open' | 'message' | 'error' | 'close' | 'timeout' | 'exception';

export interface SSEConfig extends Omit<EventSourceOptions, 'debug'> {
  url: string;
  debug?: boolean;
  reconnectOnError?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export type SSEStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

export interface SSEEvent {
  type: SSEEventType;
  data?: any;
  eventId?: string;
  url?: string;
  message?: string;
  error?: Error;
  xhrState?: number;
  xhrStatus?: number;
}

export interface SSEState {
  status: SSEStatus;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  isError: boolean;
  lastEvent?: SSEEvent;
  error?: Error;
  reconnectAttempts: number;
}

export interface SSEMessage {
  id: string;
  timestamp: Date;
  type: SSEEventType;
  content: string;
  event?: SSEEvent;
}

export interface UseSSEOptions {
  enabled?: boolean;
  reconnectOnError?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  maxMessages?: number;
  onOpen?: (event: SSEEvent) => void;
  onMessage?: (event: SSEEvent) => void;
  onError?: (event: SSEEvent) => void;
  onClose?: (event: SSEEvent) => void;
}

export interface UseSSEReturn {
  state: SSEState;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  isError: boolean;
  lastEvent?: SSEEvent;
  error?: Error;
  messages: SSEMessage[];
  clearMessages: () => void;
}

export type SSEEventCallback = (event: SSEEvent) => void;
export type SSEStatusCallback = (status: SSEStatus) => void;

export interface ISSEService {
  connect(config: SSEConfig): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;
  on(event: SSEEventType, callback: SSEEventCallback): void;
  off(event: SSEEventType, callback?: SSEEventCallback): void;
  getStatus(): SSEStatus;
  isConnected(): boolean;
}

export type SSELibraryEvent = EventSourceEvent<any>;
export type SSELibraryOptions = EventSourceOptions;
