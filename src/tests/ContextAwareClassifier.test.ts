import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextAwareClassifier, ContextClassificationResult, setClassifierAdapter } from '../systems/context/ContextAwareClassifier';
import { LogLevel } from '../systems/context/StructuredLogger';
import { BatchClassificationResult } from '../types';

global.fetch = vi.fn();

describe('ContextAwareClassifier', () => {
    let classifier: ContextAwareClassifier;
    let mockAdapter: any;

    beforeEach(() => {
        classifier = new ContextAwareClassifier();
        classifier.clearMemory();
        classifier.clearCache();
        classifier.resetMetrics();
        vi.clearAllMocks();

        mockAdapter = {
            classifyWithScoring: vi.fn(),
            isBlank: vi.fn().mockImplementation((line) => !line || line.trim() === '')
        };
        setClassifierAdapter(mockAdapter);
    });

    it('should classify with full context using API', async () => {
        const mockResponse: ContextClassificationResult = {
            type: 'character',
            confidence: 95,
            reasoning: 'It looks like a character name'
        };

        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        const result = await classifier.classifyWithFullContext(
            'JOHN:',
            ['EXT. PARK'],
            ['Hello there.'],
            ['scene-header-top-line']
        );

        expect(result.type).toBe('character');
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(classifier.getMetrics().apiCalls).toBe(1);
    });

    it('should use cache for repeated calls', async () => {
        const mockResponse: ContextClassificationResult = {
            type: 'character',
            confidence: 95,
            reasoning: 'It looks like a character name'
        };

        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        // First call
        await classifier.classifyWithFullContext(
            'JOHN:',
            ['EXT. PARK'],
            ['Hello there.'],
            ['scene-header-top-line']
        );

        // Second call with same inputs
        const result2 = await classifier.classifyWithFullContext(
            'JOHN:',
            ['EXT. PARK'],
            ['Hello there.'],
            ['scene-header-top-line']
        );

        expect(result2.type).toBe('character');
        expect(fetch).toHaveBeenCalledTimes(1); // Should be called only once
        expect(classifier.getMetrics().cacheHits).toBe(1);
    });

    it('should fallback to local classification on API failure', async () => {
        (fetch as any).mockRejectedValue(new Error('Network Error'));

        const result = await classifier.classifyWithFullContext(
            'JOHN:',
            ['EXT. PARK'],
            ['Hello there.'],
            ['scene-header-top-line']
        );

        // Local classifier should identify "JOHN:" as character because it ends with ":"
        expect(result.type).toBe('character');
        expect(classifier.getMetrics().fallbackCalls).toBe(1);
    });

    it('should fallback to local classification on API 429 after retries', async () => {
        vi.useFakeTimers();
        (fetch as any).mockResolvedValue({
            status: 429,
            ok: false,
            statusText: "Too Many Requests"
        });

        const promise = classifier.classifyWithFullContext(
            'JOHN:',
            ['EXT. PARK'],
            ['Hello there.'],
            ['scene-header-top-line']
        );

        // Fast forward timers for retries
        await vi.runAllTimersAsync();

        const result = await promise;

        // The local fallback for "JOHN:" should be character (it ends with :)
        expect(result.type).toBe('character');
        expect(classifier.getMetrics().fallbackCalls).toBe(1);
        vi.useRealTimers();
    });

    it('should update context memory', async () => {
        const mockResponse: ContextClassificationResult = {
            type: 'character',
            confidence: 95,
            reasoning: 'It looks like a character name'
        };

        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        await classifier.classifyWithFullContext(
            'JOHN:',
            [],
            [],
            []
        );

        // It updates memory twice: once with 'pending' and once with result
        // But since we are checking size, it should be 1 (pending is replaced/pushed out or maybe just pushed?)
        // Let's check implementation. updateContextMemory pushes.
        // It pushes 'pending' then 'enhancedResult'.
        // So size should be 2 if window allows.
        expect(classifier.getMemorySize()).toBe(2);
    });

    it('should classify batch detailed using adapter', () => {
        const text = "SCENE 1\nJOHN\nHello";
        mockAdapter.classifyWithScoring.mockImplementation((line) => {
             if (line.includes("SCENE")) return { type: 'scene-header-top-line', confidence: 'high' };
             if (line.includes("JOHN")) return { type: 'character', confidence: 'high' };
             return { type: 'dialogue', confidence: 'high' };
        });

        const results = ContextAwareClassifier.classifyBatchDetailed(text, true);

        expect(results).toHaveLength(3);
        expect(results[0].type).toBe('scene-header-top-line');
        expect(results[1].type).toBe('character');
        expect(results[2].type).toBe('dialogue');
        expect(mockAdapter.classifyWithScoring).toHaveBeenCalledTimes(3);
    });
});
