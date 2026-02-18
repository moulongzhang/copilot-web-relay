// WebSocket protocol types shared between frontend and relay-server

// --- Client → Server Messages ---

export interface PromptMessage {
  type: 'prompt';
  content: string;
  id: string;
}

export interface InterruptMessage {
  type: 'interrupt';
  id: string;
}

export interface PingMessage {
  type: 'ping';
}

export interface OpenFileMessage {
  type: 'open_file';
  path: string;
  id: string;
}

export type ClientMessage = PromptMessage | InterruptMessage | PingMessage | OpenFileMessage;

// --- Server → Client Messages ---

export interface StreamMessage {
  type: 'stream';
  content: string;
  id: string;
}

export interface ToolStartMessage {
  type: 'tool_start';
  tool: string;
  detail: string;
  id: string;
}

export interface ToolEndMessage {
  type: 'tool_end';
  tool: string;
  status: 'success' | 'failure';
  id: string;
}

export interface DoneMessage {
  type: 'done';
  id: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  id: string;
}

export interface PongMessage {
  type: 'pong';
}

export interface FileOpenedMessage {
  type: 'file_opened';
  path: string;
  success: boolean;
  message?: string;
  id: string;
}

export type ServerMessage =
  | StreamMessage
  | ToolStartMessage
  | ToolEndMessage
  | DoneMessage
  | ErrorMessage
  | PongMessage
  | FileOpenedMessage;

// --- Chat State Types ---

export interface ToolExecution {
  tool: string;
  detail: string;
  status: 'running' | 'success' | 'failure';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools: ToolExecution[];
  done: boolean;
  timestamp: number;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
