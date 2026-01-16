import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartImportSystem } from '../ai/importer/SmartImportSystem';

global.fetch = vi.fn();

describe('SmartImportSystem', () => {
    let smartImportSystem: SmartImportSystem;

    beforeEach(() => {
        smartImportSystem = new SmartImportSystem();
        vi.clearAllMocks();
    });

    it('should call Gemini API with correct payload', async () => {
        const lines = [{ text: 'INT. ROOM', type: 'scene-header-top-line' }];
        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                content: JSON.stringify([{ text: 'INT. ROOM', type: 'scene-header-top-line' }])
            })
        });

        const result = await smartImportSystem.refineWithGemini(lines);

        expect(fetch).toHaveBeenCalledWith("/api/ai/chat", expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("gemini-3-flash-preview"),
        }));
        expect(result).toHaveLength(1);
    });

    it('should handle API errors gracefully', async () => {
        (fetch as any).mockRejectedValue(new Error('Network error'));
        const lines = [{ text: 'test', type: 'action' }];

        const result = await smartImportSystem.refineWithGemini(lines);
        expect(result).toEqual([]);
    });

    it('should parse response even if wrapped in markdown code blocks', async () => {
        const lines = [{ text: 'test', type: 'action' }];
        const jsonContent = JSON.stringify(lines);
        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                content: "```json\n" + jsonContent + "\n```"
            })
        });

        const result = await smartImportSystem.refineWithGemini(lines);
        expect(result).toEqual(lines);
    });
});
