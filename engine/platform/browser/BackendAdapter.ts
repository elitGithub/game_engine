/**
 * BackendAdapter - Example implementation for server-side storage
 *
 * This is an EXAMPLE showing how to create a custom storage adapter.
 * Copy and modify this for your own backend implementation.
 */
import type { StorageAdapter, SaveSlotMetadata } from '@engine/core/StorageAdapter';
import {INetworkProvider} from "@engine/interfaces";

export interface BackendConfig {
    baseUrl: string;
    authToken?: string;
    userId?: string;
}

export class BackendAdapter implements StorageAdapter {

    constructor(private config: BackendConfig, private networkProvider: INetworkProvider) {

    }

    async save(slotId: string, data: string): Promise<boolean> {
        try {
            const response = await this.networkProvider.fetch(`${this.config.baseUrl}/saves/${slotId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` })
                },
                body: JSON.stringify({
                    userId: this.config.userId,
                    slotId,
                    data
                })
            });

            return response.ok;
        } catch (error) {
            console.error('[BackendAdapter] Save failed:', error);
            return false;
        }
    }

    async load(slotId: string): Promise<string | null> {
        try {
            const response = await this.networkProvider.fetch(`${this.config.baseUrl}/saves/${slotId}?userId=${this.config.userId}`, {
                headers: {
                    ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` })
                }
            });

            if (!response.ok) return null;

            const result = await response.json();
            return result.data || null;
        } catch (error) {
            console.error('[BackendAdapter] Load failed:', error);
            return null;
        }
    }

    async delete(slotId: string): Promise<boolean> {
        try {
            const response = await this.networkProvider.fetch(`${this.config.baseUrl}/saves/${slotId}?userId=${this.config.userId}`, {
                method: 'DELETE',
                headers: {
                    ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` })
                }
            });

            return response.ok;
        } catch (error) {
            console.error('[BackendAdapter] Delete failed:', error);
            return false;
        }
    }

    async list(): Promise<SaveSlotMetadata[]> {
        try {
            const response = await this.networkProvider.fetch(`${this.config.baseUrl}/saves?userId=${this.config.userId}`, {
                headers: {
                    ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` })
                }
            });

            if (!response.ok) return [];

            const result = await response.json();
            return result.saves || [];
        } catch (error) {
            console.error('[BackendAdapter] List failed:', error);
            return [];
        }
    }
}