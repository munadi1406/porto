import { describe, it, expect, beforeEach } from 'vitest';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

describe('usePrivacyMode', () => {
    beforeEach(() => usePrivacyMode.setState({ isPrivacyMode: false }));

    it('nilai awal false', () => {
        expect(usePrivacyMode.getState().isPrivacyMode).toBe(false);
    });

    it('setPrivacyMode mengubah nilai', () => {
        usePrivacyMode.getState().setPrivacyMode(true);
        expect(usePrivacyMode.getState().isPrivacyMode).toBe(true);
    });

    it('togglePrivacyMode membalik nilai', () => {
        usePrivacyMode.getState().togglePrivacyMode();
        expect(usePrivacyMode.getState().isPrivacyMode).toBe(true);
        usePrivacyMode.getState().togglePrivacyMode();
        expect(usePrivacyMode.getState().isPrivacyMode).toBe(false);
    });
});