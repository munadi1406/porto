"use client";

import dynamic from "next/dynamic";

const MobileNavInner = dynamic(() => import("@/components/MobileNav").then(mod => mod.MobileNav), { ssr: false });

export function ClientMobileNav() {
    return <MobileNavInner />;
}
