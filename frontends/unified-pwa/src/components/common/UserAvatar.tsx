import React, { useState, useEffect, useRef } from 'react';

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

// Global cache of failed image URLs to avoid repeated browser broken icon flashes
const failedImageUrls = new Set<string>();

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
  showStatus = false,
  statusOnline = true,
}) => {
  const isKnownFailed = Boolean(src && failedImageUrls.has(src));
  const [hasError, setHasError] = useState(isKnownFailed);
  const currentSrcRef = useRef(src);

  useEffect(() => {
    if (src !== currentSrcRef.current) {
      currentSrcRef.current = src;
      setHasError(Boolean(src && failedImageUrls.has(src)));
    }
  }, [src]);

  // Derive initial from name or default (e.g. John Wesley -> JW or J)
  const getInitials = (n?: string | null): string => {
    if (!n?.trim()) return 'U';
    const parts = n.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const initials = getInitials(name);
  const shouldShowImage = Boolean(src && !hasError && !isKnownFailed);

  return (
    <div 
      className={`relative inline-flex shrink-0 ${className}`}
      aria-label={name || 'User Avatar'}
    >
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center border-2 border-[#FACD15] shadow-sm bg-[#0A1931] text-[#FACD15] font-black select-none`}
      >
        {shouldShowImage ? (
          <img
            src={src || ''}
            alt=""
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={(e) => {
              if (src) failedImageUrls.add(src);
              (e.currentTarget as HTMLElement).style.display = 'none';
              setHasError(true);
            }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0A1931] text-[#FACD15]">
            {name ? (
              <span className="font-extrabold text-[0.8em] tracking-tight">{initials}</span>
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
