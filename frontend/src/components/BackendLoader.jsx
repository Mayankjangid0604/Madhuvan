import { useEffect, useState } from 'react';
import { Loader2, Server, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const BackendLoader = ({ children }) => {
  const [status, setStatus] = useState('connecting'); // connecting, ready, error
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    let retryTimer = null;

    const checkBackend = async () => {
      try {
        // Check if running in Electron
        if (window.electronAPI) {
          const result = await window.electronAPI.getBackendStatus();
          if (result.ready) {
            if (mounted) setStatus('ready');
            return;
          }
          
          // Wait for backend
          const waitResult = await window.electronAPI.waitForBackend();
          if (mounted) {
            if (waitResult.ready) {
              setStatus('ready');
            } else {
              setError(waitResult.error || 'Backend failed to start');
              setStatus('error');
            }
          }
        } else {
          // Web mode - check API directly
          try {
            const response = await fetch('http://localhost:5001/health');
            if (response.ok) {
              if (mounted) setStatus('ready');
            } else {
              throw new Error('Backend not ready');
            }
          } catch {
            // Retry after 1 second
            if (mounted && retryCount < 30) {
              retryTimer = setTimeout(() => {
                setRetryCount(prev => prev + 1);
              }, 1000);
            } else if (mounted) {
              setStatus('error');
              setError('Could not connect to backend');
            }
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setStatus('error');
        }
      }
    };

    checkBackend();

    // Listen for backend status updates from Electron
    if (window.electronAPI) {
      window.electronAPI.onBackendStatus((data) => {
        if (data.ready) {
          setStatus('ready');
        } else if (data.error) {
          setError(data.error);
          setStatus('error');
        }
      });
    }

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (window.electronAPI) {
        window.electronAPI.removeBackendStatusListener?.();
      }
    };
  }, [retryCount]);

  const handleRetry = () => {
    setStatus('connecting');
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  if (status === 'ready') {
    return children;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {status === 'connecting' && (
          <>
            <div style={styles.iconWrapper}>
              <Server size={48} style={styles.serverIcon} />
              <Loader2 size={24} style={styles.spinner} />
            </div>
            <h2 style={styles.title}>Starting Application</h2>
            <p style={styles.subtitle}>
              Connecting to backend services...
            </p>
            <div style={styles.progressBar}>
              <div style={styles.progressFill}></div>
            </div>
            <p style={styles.hint}>
              This may take a few seconds on first launch
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={styles.errorIconWrapper}>
              <AlertCircle size={48} color="#ef4444" />
            </div>
            <h2 style={styles.errorTitle}>Connection Failed</h2>
            <p style={styles.errorMessage}>
              {error || 'Could not connect to backend services'}
            </p>
            <button style={styles.retryButton} onClick={handleRetry}>
              <RefreshCw size={18} />
              <span>Retry Connection</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    zIndex: 9999,
  },
  card: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '24px',
    padding: '48px',
    textAlign: 'center',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.3)',
  },
  iconWrapper: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100px',
    height: '100px',
    marginBottom: '24px',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))',
    borderRadius: '24px',
  },
  serverIcon: {
    color: '#059669',
  },
  spinner: {
    position: 'absolute',
    bottom: '-8px',
    right: '-8px',
    color: '#059669',
    animation: 'spin 1s linear infinite',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: '0 0 24px 0',
  },
  progressBar: {
    height: '4px',
    background: 'rgba(16, 185, 129, 0.2)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #10b981, #059669)',
    borderRadius: '2px',
    animation: 'progress 2s ease-in-out infinite',
  },
  hint: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
  },
  errorIconWrapper: {
    marginBottom: '24px',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#dc2626',
    margin: '0 0 8px 0',
  },
  errorMessage: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 24px 0',
  },
  retryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes progress {
    0% { width: 0%; margin-left: 0; }
    50% { width: 70%; margin-left: 15%; }
    100% { width: 0%; margin-left: 100%; }
  }
`;
document.head.appendChild(styleSheet);

export default BackendLoader;