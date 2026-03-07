import React, { useState, useEffect } from 'react';
import { applyPhoneMask, normalizePhone } from '../utils/phoneUtils';

interface Props {
  value: string;
  onChange: (maskedValue: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * PhoneInput — renders a masked phone field.
 * - Format: +DDI (DDD) XXXXX-XXXX (e.g., +55 (11) 99999-9999)
 * - Normalizes existing data on mount.
 * - onChange returns the masked string (with +, spaces, parens, hyphen).
 */
export default function PhoneInput({
  value,
  onChange,
  required = false,
  placeholder = '+55 (11) 99999-9999',
  className = '',
  disabled = false,
  id,
}: Props) {
  const [display, setDisplay] = useState('');

  // On mount / value change from outside: normalize existing value
  useEffect(() => {
    if (value) {
      const normalized = normalizePhone(value);
      setDisplay(normalized);
    } else {
      setDisplay('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = applyPhoneMask(raw);
    setDisplay(masked);
    onChange(masked);
  };

  return (
    <input
      id={id}
      type="tel"
      value={display}
      onChange={handleChange}
      required={required}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={22} // +XX (XX) XXXXX-XXXX = 20 chars max
      className={className}
    />
  );
}
