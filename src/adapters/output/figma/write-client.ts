/**
 * Write Client for figma-mcp-write-server
 *
 * WebSocket client that connects to the figma-mcp-write-server
 * for Plugin API access to create/update Figma variables and styles.
 *
 * @see https://github.com/anthropics/figma-mcp-write-server
 *
 * Setup:
 * 1. Install figma-mcp-write-server: npx figma-mcp-write-server
 * 2. Open Figma Desktop and activate the write-server plugin
 * 3. The server runs on ws://localhost:3055 by default
 */

import type {
  WriteServerClient,
  PluginStatus,
  PluginTextStyleParams,
  PluginEffectStyleParams,
  PluginPaintStyleParams,
} from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * JSON-RPC 2.0 request format
 */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

/**
 * JSON-RPC 2.0 response format
 */
interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Write client configuration options
 */
export interface WriteClientOptions {
  /**
   * WebSocket URL for the write server
   * @default 'ws://localhost:3055'
   */
  url?: string;

  /**
   * Connection timeout in milliseconds
   * @default 5000
   */
  timeout?: number;

  /**
   * Auto-reconnect on disconnect
   * @default false
   */
  autoReconnect?: boolean;
}

/**
 * Variable creation parameters for Plugin API
 */
export interface VariableCreateParams {
  name: string;
  collectionName: string;
  resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
  valuesByMode: Record<string, unknown>;
  description?: string;
}

// =============================================================================
// Write Client Implementation
// =============================================================================

/**
 * WebSocket client for figma-mcp-write-server
 */
export class FigmaWriteClient implements WriteServerClient {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();

  private readonly url: string;
  private readonly timeout: number;
  private readonly autoReconnect: boolean;

  constructor(options: WriteClientOptions = {}) {
    this.url = options.url ?? 'ws://localhost:3055';
    this.timeout = options.timeout ?? 5000;
    this.autoReconnect = options.autoReconnect ?? false;
  }

  /**
   * Connect to the write server
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Connection timeout after ${this.timeout}ms`));
      }, this.timeout);

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          clearTimeout(timeoutId);
          resolve();
        };

        this.ws.onerror = (event) => {
          clearTimeout(timeoutId);
          reject(new Error(`WebSocket error: ${event}`));
        };

        this.ws.onclose = () => {
          this.handleDisconnect();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the write server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
      this.pendingRequests.delete(id);
    }
  }

  /**
   * Check if connected to the write server
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get plugin connection status and current file info
   */
  async getStatus(): Promise<PluginStatus> {
    try {
      const result = await this.call('figma_plugin_status', {}) as {
        connected: boolean;
        fileName?: string;
        fileKey?: string;
      };

      return {
        connected: result.connected,
        file: result.fileName,
        fileKey: result.fileKey,
      };
    } catch {
      return {
        connected: false,
      };
    }
  }

  /**
   * Create/update variables via Plugin API
   */
  async variables(params: VariableCreateParams[]): Promise<void> {
    await this.call('figma_variables', {
      variables: params.map(p => ({
        action: 'CREATE',
        name: p.name,
        collectionName: p.collectionName,
        resolvedType: p.resolvedType,
        valuesByMode: p.valuesByMode,
        description: p.description,
      })),
    });
  }

  /**
   * Create/update text styles via Plugin API
   */
  async textStyles(params: PluginTextStyleParams[]): Promise<void> {
    await this.call('figma_styles', {
      type: 'TEXT',
      styles: params.map(p => ({
        action: p.action,
        id: p.id,
        ...p.style,
      })),
    });
  }

  /**
   * Create/update effect styles via Plugin API
   */
  async effectStyles(params: PluginEffectStyleParams[]): Promise<void> {
    await this.call('figma_effects', {
      styles: params.map(p => ({
        action: p.action,
        id: p.id,
        ...p.style,
      })),
    });
  }

  /**
   * Create/update paint styles via Plugin API
   */
  async paintStyles(params: PluginPaintStyleParams[]): Promise<void> {
    await this.call('figma_styles', {
      type: 'PAINT',
      styles: params.map(p => ({
        action: p.action,
        id: p.id,
        ...p.style,
      })),
    });
  }

  /**
   * Generic styles method for WriteServerClient interface
   */
  async styles(params: Array<PluginTextStyleParams | PluginEffectStyleParams | PluginPaintStyleParams>): Promise<void> {
    // Group by style type and call appropriate methods
    const textStyles: PluginTextStyleParams[] = [];
    const effectStyles: PluginEffectStyleParams[] = [];
    const paintStyles: PluginPaintStyleParams[] = [];

    for (const param of params) {
      if ('style' in param) {
        if ('fontFamily' in param.style) {
          textStyles.push(param as PluginTextStyleParams);
        } else if ('effects' in param.style) {
          effectStyles.push(param as PluginEffectStyleParams);
        } else if ('paints' in param.style) {
          paintStyles.push(param as PluginPaintStyleParams);
        }
      }
    }

    const promises: Promise<void>[] = [];
    if (textStyles.length > 0) promises.push(this.textStyles(textStyles));
    if (effectStyles.length > 0) promises.push(this.effectStyles(effectStyles));
    if (paintStyles.length > 0) promises.push(this.paintStyles(paintStyles));

    await Promise.all(promises);
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Make a JSON-RPC call to the write server
   */
  private async call(method: string, params: unknown): Promise<unknown> {
    if (!this.isConnected()) {
      await this.connect();
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout for ${method}`));
      }, this.timeout);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      this.ws!.send(JSON.stringify(request));
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const response: JsonRpcResponse = JSON.parse(data);

      const pending = this.pendingRequests.get(response.id);
      if (!pending) return;

      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.id);

      if (response.error) {
        pending.reject(new Error(response.error.message));
      } else {
        pending.resolve(response.result);
      }
    } catch {
      // Ignore malformed messages
    }
  }

  /**
   * Handle WebSocket disconnect
   */
  private handleDisconnect(): void {
    this.ws = null;

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection lost'));
      this.pendingRequests.delete(id);
    }

    if (this.autoReconnect) {
      setTimeout(() => this.connect().catch(() => {}), 1000);
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new Figma write client
 */
export function createWriteClient(options?: WriteClientOptions): FigmaWriteClient {
  return new FigmaWriteClient(options);
}

/**
 * Try to connect to the write server, return null if not available
 */
export async function tryConnectWriteServer(
  options?: WriteClientOptions
): Promise<FigmaWriteClient | null> {
  const client = createWriteClient(options);

  try {
    await client.connect();
    const status = await client.getStatus();

    if (status.connected) {
      return client;
    }

    client.disconnect();
    return null;
  } catch {
    return null;
  }
}
