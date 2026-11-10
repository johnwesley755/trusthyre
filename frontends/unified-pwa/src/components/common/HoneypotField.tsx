import React, { useEffect, useState } from 'react';

interface HoneypotFieldProps {
  onHoneypotChange?: (value: string) => void;
  onTimestampReady?: (timestamp: number) => void;
}

/**
 * Invisible Honeypot & Anti-Bot Timing Trap Component
 * 
 * Renders decoy input fields invisible to human users via off-screen CSS and accessibility masking.
 * Automated DOM scrapers and bots populate all discovered input fields, triggering instant backend
 * shadow-drop protection without user friction.
 */
export const HoneypotField: React.FC<HoneypotFieldProps> = ({
  onHoneypotChange,
  onTimestampReady
}) => {
  const [formTimestamp] = useState<number>(() => Date.now());

  useEffect(() => {
    if (onTimestampReady) {
      onTimestampReady(formTimestamp);
    }
  }, [formTimestamp, onTimestampReady]);

  return (
    <div
      style={{
        position: 'absolute',
        left: '-9999px',
        top: '-9999px',
        opacity: 0,
        height: 0,
        width: 0,
        overflow: 'hidden',
        pointerEvents: 'none'
      }}
      aria-hidden="true"
      tabIndex={-1}
    >
      {/* Decoy Field 1: Appears to be a company website URL to bots */}
      <label htmlFor="website_hp_input">Please leave this field empty</label>
      <input
        id="website_hp_input"
        type="text"
        name="website_hp"
        autoComplete="new-password"
        tabIndex={-1}
        onChange={(e) => onHoneypotChange?.(e.target.value)}
      />

      {/* Form timing tracking input */}
      <input
        type="hidden"
        name="form_ts"
        value={formTimestamp}
        readOnly
      />
    </div>
  );
};

export default HoneypotField;

