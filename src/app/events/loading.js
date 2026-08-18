const LoadingStyles = {
  container: {
    minHeight: '100vh',
    background: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '1rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #212225',
    borderTop: '3px solid #D4AF37',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  text: {
    color: '#FFFFFF',
    fontSize: '1rem',
    fontWeight: '400',
  },
};

export default function EventsLoading() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={LoadingStyles.container}>
        <div style={LoadingStyles.spinner} />
        <p style={LoadingStyles.text}>Loading events...</p>
      </div>
    </>
  );
}
