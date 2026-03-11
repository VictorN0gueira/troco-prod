import React from 'react';
import { MastercardIcon, VisaIcon, EloIcon, AmexIcon, HipercardIcon, GenericCardIcon } from '../BrandIcons';

export const renderBrandIcon = (brandName?: string, className = "h-4") => {
    const name = brandName?.toLowerCase() || '';

    // Helper inline block para centralizar icones pequenos no formato de texto
    const inlineClass = `inline-flex items-center justify-center ${className}`;

    if (name.includes('master')) return <MastercardIcon className={className} />;
    if (name.includes('visa')) return <VisaIcon className={className} />;
    if (name.includes('elo')) return <EloIcon className={className} />;
    if (name.includes('american') || name.includes('amex')) return <AmexIcon className={className} />;
    if (name.includes('hipercard')) return <HipercardIcon className={className} />;

    return <GenericCardIcon className={className} />;
};
