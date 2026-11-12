'use client';
// A button that sends an email waits before it can send another (Apple review
// P121-4, P155-4): pressing "Send again" five times sent five emails, and the
// page never said when another would make sense.
import { useCallback, useEffect, useState } from 'react';

export default function useCooldown(seconds = 30) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return undefined;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const start = useCallback(() => setLeft(seconds), [seconds]);
  return { left, waiting: left > 0, start };
}

/** a...@gmail.com: enough to recognise the address, not enough to read it out. */
export function maskEmail(email) {
  const text = String(email || '').trim();
  const at = text.indexOf('@');
  if (at < 1) return '';
  return `${text[0]}...${text.slice(at)}`;
}
