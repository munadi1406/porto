"use client";

import { ReactNode } from "react";

interface PrivacyWrapperProps {
    children: ReactNode;
    isPrivate: boolean;
    className?: string;
}

/**
 * Wrapper component to apply privacy blur effect to sensitive data
 */
export function PrivacyWrapper({ children, isPrivate, className = "" }: PrivacyWrapperProps) {
    return (
        <span className={`${isPrivate ? "privacy-blur" : ""} ${className}`}>
            {children}
        </span>
    );
}
