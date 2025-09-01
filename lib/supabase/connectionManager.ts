// Connection manager to help reduce Supabase connection usage
import { createClient } from './client';

class SupabaseConnectionManager {
  private static instance: SupabaseConnectionManager;
  private client: ReturnType<typeof createClient> | null = null;
  private connections = new Set<string>();
  private maxConnections = 50; // Limit concurrent connections

  private constructor() {}

  static getInstance(): SupabaseConnectionManager {
    if (!SupabaseConnectionManager.instance) {
      SupabaseConnectionManager.instance = new SupabaseConnectionManager();
    }
    return SupabaseConnectionManager.instance;
  }

  getClient(): ReturnType<typeof createClient> {
    if (!this.client) {
      this.client = createClient();
    }
    return this.client;
  }

  addConnection(id: string): boolean {
    if (this.connections.size >= this.maxConnections) {
      console.warn('🚨 CONNECTION MANAGER: Max connections reached, rejecting new connection');
      return false;
    }
    this.connections.add(id);
    console.log(`📊 CONNECTION MANAGER: Added connection ${id}, total: ${this.connections.size}`);
    return true;
  }

  removeConnection(id: string): void {
    this.connections.delete(id);
    console.log(`📊 CONNECTION MANAGER: Removed connection ${id}, total: ${this.connections.size}`);
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  cleanup(): void {
    this.connections.clear();
    if (this.client) {
      // Remove all channels
      this.client.removeAllChannels();
    }
  }
}

export const connectionManager = SupabaseConnectionManager.getInstance();
