"use client";

import { create } from "zustand";

interface PrivacyModeStore {
    isPrivacyMode: boolean;
    setPrivacyMode: (value: boolean) => void;
    togglePrivacyMode: () => void;
}

export const usePrivacyMode = create<PrivacyModeStore>((set) => ({
    isPrivacyMode: false,
    setPrivacyMode: (value) => set({ isPrivacyMode: value }),
    togglePrivacyMode: () => set((state) => ({ isPrivacyMode: !state.isPrivacyMode })),
}));
