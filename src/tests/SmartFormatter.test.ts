import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SmartFormatter } from '../systems/formatter/SmartFormatter';
import { SmartImportSystem } from '../ai/importer/SmartImportSystem';
import * as ContextAwareClassifier from '../systems/context/ContextAwareClassifier';
import * as sceneHeaderParser from '../engine/parser/sceneHeaderParser';
import * as styles from '../utils/styles';

// Mock dependencies
vi.mock('../ai/importer/SmartImportSystem');
vi.mock('../systems/context/ContextAwareClassifier');
vi.mock('../engine/parser/sceneHeaderParser');
vi.mock('../utils/styles');

describe('SmartFormatter', () => {
    let editorElement: HTMLDivElement;
    let onUpdate: () => void;

    beforeEach(() => {
        // Setup DOM
        editorElement = document.createElement('div');
        editorElement.innerText = "SCENE 1\nJOHN\nHello";
        onUpdate = vi.fn();

        // Mock classifyBatchDetailed
        vi.spyOn(ContextAwareClassifier, 'classifyBatchDetailed').mockReturnValue([
            { text: "SCENE 1", type: "scene-header-top-line", confidence: "high" as const, doubtScore: 0, needsReview: false },
            { text: "JOHN", type: "character", confidence: "high" as const, doubtScore: 0, needsReview: false },
            { text: "Hello", type: "dialogue", confidence: "high" as const, doubtScore: 0, needsReview: false }
        ] as any);

        // Mock parseSceneHeaderFromLine
        vi.spyOn(sceneHeaderParser, 'parseSceneHeaderFromLine').mockReturnValue({ sceneNum: "1", timeLocation: "INT. HOUSE" });

        // Mock getFormatStyles
        vi.spyOn(styles, 'getFormatStyles').mockReturnValue({ color: 'black' } as any);

        // Mock AI System
        (SmartImportSystem as any).mockImplementation(() => ({
            refineWithGemini: vi.fn().mockResolvedValue([])
        }));
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should format editor content correctly', async () => {
        await SmartFormatter.runFullFormat(editorElement, onUpdate);

        expect(ContextAwareClassifier.classifyBatchDetailed).toHaveBeenCalledWith("SCENE 1\nJOHN\nHello", true);
        expect(onUpdate).toHaveBeenCalled();
        expect(editorElement.innerHTML).toContain('class="scene-header-top-line"');
        expect(editorElement.innerHTML).toContain('class="character"');
        expect(editorElement.innerHTML).toContain('class="dialogue"');
    });

    it('should use AI refinement if available', async () => {
        (SmartImportSystem as any).mockImplementation(() => ({
            refineWithGemini: vi.fn().mockResolvedValue([
                { text: "SCENE 1", type: "scene-header-top-line", confidence: "high" as const, doubtScore: 0, needsReview: false },
                { text: "JOHN", type: "character", confidence: "high" as const, doubtScore: 0, needsReview: false },
                { text: "Hello", type: "dialogue", confidence: "high" as const, doubtScore: 0, needsReview: false }
            ])
        }));

        await SmartFormatter.runFullFormat(editorElement, onUpdate);

        // It should still work and apply changes
        expect(editorElement.children.length).toBeGreaterThan(0);
    });

    it('should filter blank lines between character and dialogue', async () => {
        vi.spyOn(ContextAwareClassifier, 'classifyBatchDetailed').mockReturnValue([
            { text: "JOHN", type: "character", confidence: "high" as const, doubtScore: 0, needsReview: false },
            { text: "", type: "action", confidence: "high" as const, doubtScore: 0, needsReview: false }, // Blank action acting as spacer
            { text: "Hello", type: "dialogue", confidence: "high" as const, doubtScore: 0, needsReview: false }
        ] as any);

        await SmartFormatter.runFullFormat(editorElement, onUpdate);

        // The blank line should be removed
        const divs = editorElement.querySelectorAll('div');
        // Expect Character and Dialogue (2 divs), blank removed.
        expect(divs.length).toBe(2);
        expect(divs[0].className).toBe("character");
        expect(divs[1].className).toBe("dialogue");
    });
});
