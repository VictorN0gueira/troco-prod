import React from 'react';
import { CreditCard as CardIcon } from 'lucide-react';

export const getBankLogo = (cardName: string) => {
    const n = cardName.toLowerCase();
    if (n.includes('nu') || n.includes('roxinho')) return <div className="w-8 h-8 rounded-lg bg-[#8A05BE] flex items-center justify-center font-bold text-white text-xs">nu</div>;
    if (n.includes('itaú') || n.includes('itau')) return <div className="w-8 h-8 rounded-lg bg-[#EC7000] flex items-center justify-center font-bold text-blue-900 text-xs">itaú</div>;
    if (n.includes('inter')) return <div className="w-8 h-8 rounded-lg bg-[#FF7A00] flex items-center justify-center font-bold text-white text-[10px]">inter</div>;
    if (n.includes('c6')) return <div className="w-8 h-8 rounded-lg bg-[#242424] border border-white/20 flex items-center justify-center font-bold text-white text-xs">C6</div>;
    if (n.includes('xp')) return <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center font-bold text-[#FFD700] text-xs">XP</div>;
    if (n.includes('bradesco')) return <div className="w-8 h-8 rounded-lg bg-[#CC092F] flex items-center justify-center font-bold text-white text-[9px]">Bradesco</div>;
    if (n.includes('bb') || n.includes('brasil')) return <div className="w-8 h-8 rounded-lg bg-[#F9D308] flex items-center justify-center font-bold text-[#003DA5] text-xs">bb</div>;
    if (n.includes('santander')) return <div className="w-8 h-8 rounded-lg bg-[#EC0000] flex items-center justify-center font-bold text-[8px]">Santander</div>;
    if (n.includes('btg')) return <div className="w-8 h-8 rounded-lg bg-[#002D54] flex items-center justify-center font-bold text-white text-[10px]">BTG</div>;

    return <CardIcon className="w-8 h-8 opacity-80" />;
};
