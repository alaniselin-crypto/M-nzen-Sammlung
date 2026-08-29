import React, { useState } from 'react';
import { Coins, Banknote, ImageOff } from 'lucide-react';
import { formatDriveImageUrl } from '../utils/csv';

interface CoinAvatarProps {
  imageUrl?: string | null;
  name: string;
  faceValue?: string;
  currency?: string;
  material?: string;
  isBanknote?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  containImage?: boolean;
  className?: string;
  onClick?: () => void;
  altText?: string;
}

export const CoinAvatar: React.FC<CoinAvatarProps> = ({
  imageUrl,
  name,
  faceValue = '',
  currency = '',
  material = '',
  isBanknote = false,
  size = 'md',
  containImage = false,
  className = '',
  onClick,
  altText
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset error state if imageUrl changes
  React.useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  const mat = (material || '').toLowerCase();
  const isGold = mat.includes('gold');
  const isSilver = mat.includes('silber') || mat.includes('silver');
  const isBimetal = mat.includes('bimetall') || mat.includes('bimetal');

  // Size configurations
  const sizeClasses = {
    sm: isBanknote ? 'w-11 h-7 rounded-md text-xs' : 'w-8 h-8 rounded-full text-xs',
    md: isBanknote ? 'w-24 sm:w-28 h-16 sm:h-18 rounded-xl text-sm' : 'w-20 h-20 sm:w-24 sm:h-24 rounded-full text-base',
    lg: isBanknote ? 'w-48 h-32 rounded-xl text-base' : 'w-36 h-36 sm:w-44 sm:h-44 rounded-full text-lg',
    xl: isBanknote ? 'w-64 sm:w-80 h-40 sm:h-52 rounded-2xl text-lg' : 'w-48 h-48 sm:w-64 sm:h-64 rounded-full text-xl'
  };

  const formattedUrl = formatDriveImageUrl(imageUrl);
  const hasValidImage = Boolean(formattedUrl && formattedUrl.trim() !== '' && !imageError);

  if (hasValidImage) {
    const frameClasses = `${
      isBanknote
        ? 'border-emerald-500/60 shadow-emerald-950/40'
        : 'border-amber-500/50 shadow-amber-950/40'
    } ${sizeClasses[size]} ${className}`;

    if (containImage && !isBanknote) {
      return (
        <div
          onClick={onClick}
          className={`shrink-0 overflow-hidden border-2 shadow-lg transition-all duration-300 ${frameClasses}`}
        >
          <img
            src={formattedUrl}
            alt={altText || name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="h-full w-full object-contain object-center"
          />
        </div>
      );
    }

    return (
      <img
        src={formattedUrl}
        alt={altText || name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
        onClick={onClick}
        className={`object-cover border-2 shadow-lg transition-all duration-300 ${frameClasses}`}
      />
    );
  }

  // Placeholder SVG Graphic when no image or image failed to load
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden flex flex-col items-center justify-center text-center p-2 shadow-inner border-2 transition-all duration-300 select-none ${
        isBanknote
          ? 'bg-gradient-to-br from-emerald-950 via-emerald-900/60 to-amber-950/80 border-emerald-500/50 text-emerald-200 shadow-emerald-950/50'
          : isGold
          ? 'bg-gradient-to-br from-amber-600/30 via-yellow-700/20 to-amber-950/90 border-amber-400/60 text-amber-200 shadow-amber-950/60'
          : isSilver
          ? 'bg-gradient-to-br from-slate-600/30 via-slate-700/20 to-slate-900/90 border-slate-300/50 text-slate-200 shadow-slate-950/60'
          : isBimetal
          ? 'bg-gradient-to-br from-amber-600/25 via-slate-700/30 to-amber-950/90 border-amber-400/50 text-amber-200 shadow-amber-950/60'
          : 'bg-gradient-to-br from-amber-900/30 via-[#221813] to-[#140e0b] border-amber-600/40 text-amber-300 shadow-amber-950/60'
      } ${sizeClasses[size]} ${className}`}
      title={imageError ? 'Bild konnte nicht geladen werden' : 'Kein Bild vorhanden'}
    >
      {/* Milled coin rim / watermark decorative SVG */}
      <svg
        className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
      >
        <circle cx="50" cy="50" r="46" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="50" cy="50" r="40" strokeWidth="1" />
        <circle cx="50" cy="50" r="32" strokeWidth="0.5" />
      </svg>

      {/* Central Icon */}
      {isBanknote ? (
        <Banknote className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400/90 mb-0.5 shrink-0" />
      ) : (
        <div className="relative mb-0.5 shrink-0 flex items-center justify-center">
          <Coins className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400/90" />
        </div>
      )}

      {/* Face value or short name */}
      {faceValue ? (
        <span className="font-serif font-extrabold tracking-tight text-amber-200 z-10 drop-shadow-md line-clamp-1">
          {faceValue} {currency}
        </span>
      ) : (
        <span className="text-[10px] sm:text-xs font-semibold tracking-wide uppercase text-amber-300/80 z-10 line-clamp-1">
          {isBanknote ? 'Banknote' : 'Münze'}
        </span>
      )}

      {/* Placeholder Label */}
      <span className="text-[9px] font-medium text-amber-400/60 uppercase tracking-widest mt-0.5 z-10">
        Kein Bild
      </span>
    </div>
  );
};
