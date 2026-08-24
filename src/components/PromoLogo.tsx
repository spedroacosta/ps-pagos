import React from 'react';

interface PromoLogoProps {
  className?: string;
  logoUrl?: string | null;
}

export const PromoLogo: React.FC<PromoLogoProps> = ({ className = 'h-12 sm:h-14 md:h-16', logoUrl }) => {
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={logoUrl || "/logo.jpg"}
        alt="Logo Promoción"
        className="h-full w-auto object-contain max-w-full rounded-xl"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

