'use client'

import Link from 'next/link';

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
    textAlign: 'center',
  },
  heading: {
    color: '#FFFFFF',
    fontSize: '1.75rem',
    fontWeight: '700',
  },
  message: {
    color: '#FFFFFF',
    fontSize: '1rem',
    maxWidth: '480px',
    opacity: 0.7,
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
  },
  button: {
    padding: '0.625rem 1.5rem',
    background: '#ED1C24',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  homeButton: {
    padding: '0.625rem 1.5rem',
    background: 'transparent',
    color: '#FFFFFF',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-block',
  },
};

export default function MyTournamentsError({ error, reset }) {
  return (
    <div style={ErrorStyles.container}>
      <h2 style={ErrorStyles.heading}>Something went wrong</h2>
      <p style={ErrorStyles.message}>{error?.message || 'An unexpected error occurred while loading your tournaments.'}</p>
      <div style={ErrorStyles.actions}>
        <button style={ErrorStyles.button} onClick={reset}>Try again</button>
        <Link href="/tournaments" style={ErrorStyles.homeButton}>Go home</Link>
      </div>
    </div>
  );
}
