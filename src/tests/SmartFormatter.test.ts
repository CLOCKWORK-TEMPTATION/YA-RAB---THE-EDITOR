import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SmartFormatter } from '../systems/formatter/SmartFormatter';
import * as FormatterDependencies from '../systems/formatter/FormatterDependencies';
import { SmartImportSystem } from '../ai/importer/SmartImportSystem';

// Mock dependencies
vi.mock('../ai/importer/SmartImportSystem');

describe('SmartFormatter', () => {
    let editorElement: HTMLDivElement;
    let onUpdate: () => void;
    let classifierAdapter: any;
    let stylesAdapter: any;

    beforeEach(() => {
        // Setup DOM
        editorElement = document.createElement('div');
        editorElement.innerText = "SCENE 1\nJOHN\nHello";
        onUpdate = vi.fn();

        // Setup Adapters
        classifierAdapter = {
            classifyBatch: vi.fn().mockReturnValue([
                { text: "SCENE 1", type: "scene-header-top-line" },
                { text: "JOHN", type: "character" },
                { text: "Hello", type: "dialogue" }
            ]),
            applyEnterSpacingRules: vi.fn().mockImplementation((lines) => lines),
            parseSceneHeaderFromLine: vi.fn().mockReturnValue({ sceneNum: "1", timeLocation: "INT. HOUSE" })
        };

        stylesAdapter = {
            getFormatStyles: vi.fn().mockReturnValue({ color: 'black' })
        };

        FormatterDependencies.setClassifierAdapter(classifierAdapter);
        FormatterDependencies.setStylesAdapter(stylesAdapter);

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

        expect(classifierAdapter.classifyBatch).toHaveBeenCalledWith("SCENE 1\nJOHN\nHello", true);
        expect(onUpdate).toHaveBeenCalled();
        expect(editorElement.innerHTML).toContain('class="scene-header-top-line"');
        expect(editorElement.innerHTML).toContain('class="character"');
        expect(editorElement.innerHTML).toContain('class="dialogue"');
    });

    it('should use AI refinement if available', async () => {
        (SmartImportSystem as any).mockImplementation(() => ({
            refineWithGemini: vi.fn().mockResolvedValue([
                { text: "SCENE 1", type: "scene-header-top-line" },
                { text: "JOHN", type: "character" },
                { text: "Hello", type: "dialogue" }
            ])
        }));

        await SmartFormatter.runFullFormat(editorElement, onUpdate);

        // It should still work and apply changes
        expect(editorElement.children.length).toBeGreaterThan(0);
    });

    it('should filter blank lines between character and dialogue', async () => {
        classifierAdapter.classifyBatch.mockReturnValue([
            { text: "JOHN", type: "character" },
            { text: "", type: "action" }, // Blank action acting as spacer
            { text: "Hello", type: "dialogue" }
        ]);

        await SmartFormatter.runFullFormat(editorElement, onUpdate);

        // The blank line should be removed
        // Verify by checking calls to stylesAdapter or final HTML structure
        // Since we mock styles, we can check how many times it was called or the length of classifiedLines passed to forEach loop inside runFullFormat
        // Ideally we check the output HTML
        const divs = editorElement.querySelectorAll('div');
        // Expect Character and Dialogue (2 divs), blank removed.
        expect(divs.length).toBe(2);
        expect(divs[0].className).toBe("character");
        expect(divs[1].className).toBe("dialogue");
    });
});
