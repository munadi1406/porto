"use client";
import { createContext, useContext, useState, useEffect } from "react";

export type Lang = "en" | "id";
const LocaleCtx = createContext<{ lang: Lang; setLang: (l: Lang)=>void; t: (en: string, id: string)=>string }>(null as any);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLang] = useState<Lang>("id");
    useEffect(() => {
        const saved = localStorage.getItem("porto-lang") as Lang | null;
        if (saved === "en" || saved === "id") setLang(saved);
    }, []);
    const set = (l: Lang) => { setLang(l); localStorage.setItem("porto-lang", l); };
    return <LocaleCtx.Provider value={{ lang, setLang: set, t: (en,id)=> lang==="id"? id : en }}>{children}</LocaleCtx.Provider>;
}
export function useLocale() { return useContext(LocaleCtx); }
