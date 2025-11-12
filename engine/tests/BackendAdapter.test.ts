// engine/tests/BackendAdapter.test.ts

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {BackendAdapter} from "@engine/platform/browser/BackendAdapter";
import {ILogger} from "@engine/interfaces";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};
describe('BackendAdapter', () => {
    let adapter: BackendAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        const mockNetworkProvider = {fetch: mockFetch};

        adapter = new BackendAdapter({
            baseUrl: 'https://api.mygame.com',
            authToken: 'test_token',
            userId: 'user_123'
        }, mockNetworkProvider, mockLogger);
    });

    it('should save data via POST', async () => {
        mockFetch.mockResolvedValue({ok: true});

        const success = await adapter.save('slot1', '{"health":100}');

        expect(success).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith('https://api.mygame.com/saves/slot1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test_token'
            },
            body: JSON.stringify({
                userId: 'user_123',
                slotId: 'slot1',
                data: '{"health":100}'
            })
        });
    });

    it('should load data via GET', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({data: '{"health":100}'})
        });

        const data = await adapter.load('slot1');

        expect(data).toBe('{"health":100}');
        expect(mockFetch).toHaveBeenCalledWith('https://api.mygame.com/saves/slot1?userId=user_123', {
            headers: {'Authorization': 'Bearer test_token'}
        });
    });

    it('should delete data via DELETE', async () => {
        mockFetch.mockResolvedValue({ok: true});

        const success = await adapter.delete('slot1');

        expect(success).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith('https://api.mygame.com/saves/slot1?userId=user_123', {
            method: 'DELETE',
            headers: {'Authorization': 'Bearer test_token'}
        });
    });

    it('should list data via GET', async () => {
        const mockSaves = [{slotId: 'slot1', timestamp: 100}];
        mockFetch.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({saves: mockSaves})
        });

        const list = await adapter.list();

        expect(list).toBe(mockSaves);
        expect(mockFetch).toHaveBeenCalledWith('https://api.mygame.com/saves?userId=user_123', {
            headers: {'Authorization': 'Bearer test_token'}
        });
    });
});