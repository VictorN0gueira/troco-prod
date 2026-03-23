import React from 'react';
import { motion } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export interface CosmeticAvatarProps {
  src: string;
  alt?: string;
  frame?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const CosmeticAvatar: React.FC<CosmeticAvatarProps> = ({ 
  src, 
  alt = 'Avatar', 
  frame = 'none',
  size = 'md' 
}) => {
  const [isLottieLoaded, setIsLottieLoaded] = React.useState(false);

  // mapped sizes
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-20 h-20 sm:w-24 sm:h-24',
    xl: 'w-32 h-32 sm:w-40 sm:h-40'
  };

  const currentSizeClass = sizeClasses[size];

  // Base image
  const AvatarImage = ({ scale = 1 }: { scale?: number }) => (
    <div 
      className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center p-0.5"
      style={{ transform: `scale(${scale})` }}
    >
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover rounded-full ${frame === 'none' ? 'border-2 border-white dark:border-slate-800' : ''}`}
      />
    </div>
  );

  const LottieFrame = ({ url, scale = 140, offsetY = 0 }: { url: string, scale?: number, offsetY?: number }) => (
    <div 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center"
      style={{ 
        width: `${scale}%`, 
        height: `${scale}%`,
        marginTop: `${offsetY}%`
      }}
    >
      <DotLottieReact
        src={url}
        loop
        autoplay
        onLoad={() => setIsLottieLoaded(true)}
      />
    </div>
  );

  // Fallback ring while loading
  const GlowRing = () => (
    <div className="absolute inset-[-4px] rounded-full border-2 border-amber-400/30 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.3)] z-0" />
  );

  return (
    <div className={`relative ${currentSizeClass} flex items-center justify-center shrink-0`}>
      {/* Background/Base Rings */}
      {frame === 'none' && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary-500 to-emerald-300 shadow-lg p-0.5 pointer-events-none">
          <AvatarImage />
        </div>
      )}

      {/* Lottie frames with loading state */}
      {frame.startsWith('star_') && (
        <>
          {!isLottieLoaded && <GlowRing />}
          <div className="absolute inset-0 rounded-full flex items-center justify-center">
            {frame === 'star_1' && <LottieFrame url="https://lottie.host/3db4b845-e880-4181-bbc8-09ff2aecdbff/ncVPJ9uEpE.lottie" />}
            {frame === 'star_2' && <LottieFrame url="https://lottie.host/def7b5b6-d6ca-4c9b-a454-ea76e06da4d5/q7W6m8unWj.lottie" />}
            {frame === 'star_3' && <LottieFrame url="https://lottie.host/fa0e044c-4364-4bba-bc4c-5f50fbe4b25f/9tbc1awcYH.lottie" />}
            {frame === 'star_4' && (
              <LottieFrame 
                url="https://lottie.host/501aebe8-f54b-4ee1-bb0e-c3ad5e61c868/OJh4ocJgxc.lottie" 
                scale={150}
                offsetY={1}
              />
            )}
            {frame === 'star_5' && (
              <LottieFrame 
                url="https://lottie.host/9be28d23-b5a7-4725-a433-1ed62395fba5/46apLDVhFF.lottie" 
                scale={150}
                offsetY={0}
              />
            )}
            <AvatarImage scale={0.88} />
          </div>
        </>
      )}
    </div>
  );
};

export default CosmeticAvatar;

