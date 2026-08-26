'use client';

import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const ErrorStyles = {
  container: {
    minHeight: '100vh',
    background: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '1.5rem',
    padding: '2rem',
    textAlign: 'center'
  },
  heading: {
    color: '#FFFFFF',
    fontSize: '1.75rem',
    fontWeight: '700'
  },
  message: {
    color: '#FFFFFF',
    fontSize: '1rem',
    maxWidth: '480px',
    opacity: 0.7
  },
  button: {
    padding: '0.625rem 1.5rem',
    background: '#ED1C24',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer'
  }
};
export default function ViewEventError({
  error,
  reset
}) {
  const tx = useTx();
  const tt = useT();
  return <div style={ErrorStyles.container}>
      <h2 style={ErrorStyles.heading}>{tt("ui.something.went.wrong.8d88", "Something went wrong")}</h2>
      <p style={ErrorStyles.message}>{error?.message || tx("An unexpected error occurred while loading this event.")}</p>
      <button style={ErrorStyles.button} onClick={reset}>{tt("ui.try.again.042c", "Try again")}</button>
    </div>;
}