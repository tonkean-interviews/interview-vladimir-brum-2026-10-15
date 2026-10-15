import { describe, expect, it } from 'vitest';
import { renderTemplate } from './template';

describe('renderTemplate', () => {
    const context = { trigger: { title: 'VPN is down', number: 12, meta: { tag: 'x' } }, nodes: {} };

    it('replaces nested paths', () => {
        expect(renderTemplate('New {{trigger.title}} (#{{ trigger.number }})', context)).toBe('New VPN is down (#12)');
    });

    it('renders missing values as empty strings', () => {
        expect(renderTemplate('[{{trigger.missing}}][{{nodes.a.messageId}}]', context)).toBe('[][]');
    });

    it('serializes objects as JSON', () => {
        expect(renderTemplate('{{trigger.meta}}', context)).toBe('{"tag":"x"}');
    });
});
