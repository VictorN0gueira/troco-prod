import React from 'react';

interface BrandIconProps {
    className?: string;
}

export const MastercardIcon: React.FC<BrandIconProps> = ({ className }) => (
    <svg viewBox="0 0 40 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="15" cy="12" r="10" fill="#EB001B" />
        <circle cx="25" cy="12" r="10" fill="#F79E1B" fillOpacity="0.8" />
    </svg>
);

export const VisaIcon: React.FC<BrandIconProps> = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor">
        <path d="M10.875 16.5h-2.1l1.35-8.25h2.1l-1.35 8.25Zm8.1-8.025c-.225-.15-1.05-.3-2.1-.3-2.25 0-3.825 1.2-3.825 2.925 0 1.275 1.2 2 2.1 2.475.9.45 1.2.75 1.2 1.2 0 .675-.825.975-1.575.975-1.05 0-1.65-.15-2.25-.45l-.3-.15-.3 1.95c.525.225 1.5.45 2.55.45 2.4 0 3.975-1.2 3.975-3.075 0-1.05-.6-1.875-2.025-2.55-.825-.45-1.35-.75-1.35-1.2 0-.45.525-.9 1.5-.9.825 0 1.35.15 1.8.3l.3.15.3-1.8Zm4.65 0h-1.65c-.6 0-1.05.225-1.275.825l-2.4 5.7h2.25s.375-1.05.45-1.275h2.7l.225 1.275h1.95l-2.25-6.525Zm-2.325 3.525c.15-.45.75-2.025.75-2.025-.075 0 .15-.45.225-.75h.075c.075.3.15.675.3 1.2l.525 1.575h-1.875Zm-15.3-3.675-.6 2.4-2.55-2.4h-2.1l3.9 8.25h2.25l2.625-8.25h-3.525Z" />
    </svg>
);

export const EloIcon: React.FC<BrandIconProps> = ({ className }) => (
    <svg viewBox="0 -2 55 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="16" fill="currentColor" fontFamily="sans-serif" fontSize="22" fontWeight="900" letterSpacing="-1.5">elo</text>
        <circle cx="36" cy="3" r="3" fill="#00A4E0" />
        <circle cx="44" cy="11" r="3" fill="#FFB700" />
        <circle cx="52" cy="3" r="3" fill="#ED1C24" />
    </svg>
);

export const AmexIcon: React.FC<BrandIconProps> = ({ className }) => (
    <svg viewBox="0 0 40 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="24" rx="4" fill="#006FCF" />
        <text x="20" y="10" fill="white" fontSize="6.5" fontWeight="900" fontFamily="sans-serif" dominantBaseline="central" textAnchor="middle">AMERICAN</text>
        <text x="20" y="16.5" fill="white" fontSize="6.5" fontWeight="900" fontFamily="sans-serif" dominantBaseline="central" textAnchor="middle">EXPRESS</text>
    </svg>
);

export const HipercardIcon: React.FC<BrandIconProps> = ({ className }) => (
    <svg viewBox="0 0 54 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="54" height="24" rx="4" fill="#B3131B" />
        <text x="27" y="13.5" fill="white" fontSize="9" fontWeight="900" fontFamily="sans-serif" fontStyle="italic" dominantBaseline="central" textAnchor="middle">HIPER</text>
    </svg>
);

export const GenericCardIcon: React.FC<BrandIconProps> = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
);
