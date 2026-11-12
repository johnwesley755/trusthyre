import React, { useState, useEffect } from 'react';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showStatus?: boolean;
  statusOnline?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
  showStatus = false,
  statusOnline = true,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  // Derive initial from name or default
  const initial = name?.trim() ? name.trim()[0].toUpperCase() : 'U';

  const shouldShowImage = src && !hasError;

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center border-2 border-[#FACD15] shadow-sm bg-[#0A1931] text-[#FACD15] font-black select-none`}
      >
        {shouldShowImage ? (
          <img
            src={src}
            alt=""
            aria-label={name || 'User Avatar'}
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0A1931] text-[#FACD15]">
            {name ? (
              <span className="font-extrabold">{initial}</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">person</span>
            )}
          </div>
        )}
      </div>

      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
            statusOnline ? 'bg-emerald-500' : 'bg-gray-400'
          }`}
        />
      )}
    </div>
  );
};
