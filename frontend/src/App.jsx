import React, { useState, useEffect, useCallback, useRef } from "react";
import { HashRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PageResetProvider } from "./contexts/PageResetContext";
import AppRoutes from "./app/routes/AppRoutes";
import AppLoader from "./components/loaders/AppLoader";
import "./index.css";
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [backendError, setBackendError] = useState(null);
  const startTimeRef = useRef(Date.now());
  const attemptsRef = useRef(0);

  // ✅ FIX: Get API base without /api suffix for health check
  const API_BASE = (
    import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, "") ||
    "http://127.0.0.1:5001"
  );

  // Phase messages for different stages
  const phaseMessages = [
    { phase: 0, messages: ["Initializing application...", "Starting up...", "Preparing environment..."] },
    { phase: 1, messages: ["Connecting to backend...", "Establishing connection...", "Reaching server..."] },
    { phase: 2, messages: ["Loading database...", "Fetching configuration...", "Syncing data..."] },
    { phase: 3, messages: ["Preparing interface...", "Loading components...", "Almost there..."] },
    { phase: 4, messages: ["Finalizing...", "Ready to launch!", "Welcome!"] }
  ];

  // Get random message for current phase
  const getPhaseMessage = useCallback((phase) => {
    const phaseData = phaseMessages[phase] || phaseMessages[0];
    return phaseData.messages[Math.floor(Math.random() * phaseData.messages.length)];
  }, []);

  // Update progress based on attempts and time
  const updateProgress = useCallback((attempts, maxAttempts) => {
    const timeElapsed = Date.now() - startTimeRef.current;
    const timeProgress = Math.min((timeElapsed / 30000) * 100, 90);
    const attemptProgress = Math.min((attempts / maxAttempts) * 100, 90);
    const newProgress = Math.max(timeProgress, attemptProgress);
    
    setProgress(newProgress);
    
    // Update phase based on progress
    if (newProgress < 20) {
      setLoadingPhase(0);
    } else if (newProgress < 40) {
      setLoadingPhase(1);
    } else if (newProgress < 60) {
      setLoadingPhase(2);
    } else if (newProgress < 80) {
      setLoadingPhase(3);
    } else {
      setLoadingPhase(4);
    }
  }, []);

  // Check backend health
  const checkBackend = useCallback(async () => {
    const maxAttempts = 60;
    attemptsRef.current = 0;
    startTimeRef.current = Date.now();

    // Check if running in Electron with IPC support
    if (window.electronAPI?.getBackendStatus && window.electronAPI?.waitForBackend) {
      try {
        const status = await window.electronAPI.getBackendStatus();
        if (status?.ready) {
          setLoadingMessage("Connected!");
          setProgress(100);
          setLoadingPhase(4);
          await new Promise((r) => setTimeout(r, 500));
          return true;
        }

        window.electronAPI.onBackendStatus?.((data) => {
          if (data.ready) {
            setLoadingMessage("Backend connected!");
            setProgress(100);
            setLoadingPhase(4);
            setTimeout(() => setIsLoading(false), 800);
          } else if (data.error) {
            setBackendError(data.error);
          }
        });

        const waitResult = await window.electronAPI.waitForBackend(20000);
        if (waitResult?.ready) {
          setLoadingMessage("Backend connected!");
          setProgress(100);
          setLoadingPhase(4);
          await new Promise((r) => setTimeout(r, 500));
          return true;
        }

        throw new Error(waitResult?.error || "Backend did not become ready");
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.log("Electron API check failed, using HTTP polling");
        }
      }
    }

    // HTTP health check loop
    while (attemptsRef.current < maxAttempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${API_BASE}/health`, {
          method: "GET",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (data.status === "OK") {
              setLoadingMessage("Connected successfully!");
              setProgress(100);
              setLoadingPhase(4);
              await new Promise((r) => setTimeout(r, 600));
              return true;
            }
          } else {
            // Fallback to plain text
            const text = await response.text();
            if (text.trim() === "OK") {
              setLoadingMessage("Connected successfully!");
              setProgress(100);
              setLoadingPhase(4);
              await new Promise((r) => setTimeout(r, 600));
              return true;
            }
          }
        }
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.log(`Attempt ${attemptsRef.current + 1}/${maxAttempts}: ${error.message || 'Connecting...'}`);
        }
      }

      attemptsRef.current++;
      updateProgress(attemptsRef.current, maxAttempts);
      
      const currentPhase = Math.min(Math.floor((attemptsRef.current / maxAttempts) * 5), 4);
      setLoadingMessage(getPhaseMessage(currentPhase));
      
      await new Promise((r) => setTimeout(r, 500));
    }

    setBackendError("Unable to connect to the server. Please try restarting the application.");
    return false;
  }, [API_BASE, updateProgress, getPhaseMessage]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setBackendError(null);
    setIsLoading(true);
    setProgress(0);
    setLoadingPhase(0);
    setLoadingMessage("Retrying connection...");
    startTimeRef.current = Date.now();
    
    checkBackend().then((success) => {
      if (success) {
        setIsLoading(false);
      }
    });
  }, [checkBackend]);

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoadingMessage("Starting application...");
        
        const success = await checkBackend();
        
        if (success) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setBackendError(err.message || "An unexpected error occurred");
      }
    };

    initializeApp();

    return () => {
      if (window.electronAPI?.removeBackendStatusListener) {
        window.electronAPI.removeBackendStatusListener();
      }
    };
  }, [checkBackend]);

  if (isLoading || backendError) {
    return (
      <AppLoader 
        message={loadingMessage}
        progress={progress}
        error={backendError}
        onRetry={handleRetry}
        hostelName="Madhuvan"
        tagline="Hostel Management System"
        showTips={true}
        showQuotes={true}
        showStats={false}
        theme="default"
        variant="full"
        autoProgress={false}
        estimatedTime={30}
      />
    );
  }

  return (
    <ThemeProvider>
      <PageResetProvider>
        <HashRouter>
          <AuthProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </AuthProvider>
        </HashRouter>
      </PageResetProvider>
    </ThemeProvider>
  );
}

export default App;