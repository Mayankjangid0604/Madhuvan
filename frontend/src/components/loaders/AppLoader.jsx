import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './appLoader.css';

const AppLoader = ({
  message = 'Loading...',
  progress = null,
  error = null,
  onRetry = null,
  hostelName = 'Madhuvan',
  tagline = 'Hostel Management System',
  showTips = true,
  showQuotes = true,
  showStats = false,
  theme = 'default',
  variant = 'full',
  logo = null,
  onComplete = null,
  autoProgress = false,
  estimatedTime = null
}) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [displayMessage, setDisplayMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [internalProgress, setInternalProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Loading tips
  const loadingTips = useMemo(() => [
    { icon: '🚀', text: 'Optimizing performance...' },
    { icon: '📊', text: 'Loading analytics dashboard...' },
    { icon: '👥', text: 'Syncing student records...' },
    { icon: '🏠', text: 'Preparing room allocations...' },
    { icon: '💳', text: 'Fetching payment details...' },
    { icon: '📱', text: 'Setting up notifications...' },
    { icon: '🔐', text: 'Securing your session...' },
    { icon: '☁️', text: 'Connecting to cloud...' },
    { icon: '⚡', text: 'Almost ready...' },
    { icon: '✨', text: 'Finalizing setup...' }
  ], []);

  // Inspirational quotes
  const quotes = useMemo(() => [
    { text: "Education is the passport to the future.", author: "Malcolm X" },
    { text: "Home is where your story begins.", author: "Annie Danielson" },
    { text: "The best preparation for tomorrow is doing your best today.", author: "H. Jackson Brown Jr." },
    { text: "Success is the sum of small efforts repeated.", author: "Robert Collier" },
    { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" }
  ], []);

  // Loading phases
  const phases = useMemo(() => [
    { name: 'Initializing', icon: '⚙️', color: '#60a5fa' },
    { name: 'Connecting', icon: '🔌', color: '#a78bfa' },
    { name: 'Loading', icon: '📦', color: '#34d399' },
    { name: 'Preparing', icon: '🎨', color: '#fbbf24' },
    { name: 'Ready', icon: '✅', color: '#22c55e' }
  ], []);

  // Stats for display
  const stats = useMemo(() => [
    { label: 'Students', value: '2,500+', icon: '👥' },
    { label: 'Rooms', value: '500+', icon: '🏠' },
    { label: 'Staff', value: '50+', icon: '👨‍💼' },
    { label: 'Years', value: '15+', icon: '📅' }
  ], []);

  // Initial content reveal
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Mouse tracking for parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Rotate tips
  useEffect(() => {
    if (!showTips || error) return;
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % loadingTips.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [showTips, loadingTips.length, error]);

  // Rotate quotes
  useEffect(() => {
    if (!showQuotes || error) return;
    const interval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [showQuotes, quotes.length, error]);

  // Typing effect
  useEffect(() => {
    if (message === displayMessage) return;

    setIsTyping(true);
    setDisplayMessage('');
    let index = 0;

    const typingInterval = setInterval(() => {
      if (index < message.length) {
        setDisplayMessage(prev => prev + message[index]);
        index++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 30);

    return () => clearInterval(typingInterval);
  }, [message]);

  // Auto progress simulation
  useEffect(() => {
    if (!autoProgress || error) return;

    const interval = setInterval(() => {
      setInternalProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          onComplete?.();
          return 100;
        }
        return prev + Math.random() * 3;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [autoProgress, onComplete, error]);

  // Elapsed time counter
  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [error]);

  // Update loading phase based on progress
  useEffect(() => {
    const currentProgress = progress ?? internalProgress;
    const phase = Math.min(Math.floor(currentProgress / 25), 4);
    setLoadingPhase(phase);
  }, [progress, internalProgress]);

  // Handle completion animation
  useEffect(() => {
    const currentProgress = progress ?? internalProgress;
    if (currentProgress >= 100 && !error) {
      setIsExiting(true);
    }
  }, [progress, internalProgress, error]);

  // Format elapsed time
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }, []);

  // Get current progress
  const currentProgress = progress ?? internalProgress;

  // Get progress status
  const getProgressStatus = useCallback(() => {
    if (error) return 'Connection failed';
    if (currentProgress < 20) return 'Initializing systems...';
    if (currentProgress < 40) return 'Connecting to server...';
    if (currentProgress < 60) return 'Loading data...';
    if (currentProgress < 80) return 'Preparing interface...';
    if (currentProgress < 100) return 'Almost there...';
    return 'Complete!';
  }, [currentProgress, error]);

  // Render minimal variant
  if (variant === 'minimal') {
    return (
      <div className={`app-loader-overlay theme-${theme} variant-minimal ${error ? 'has-error' : ''}`}>
        <div className="minimal-loader">
          {error ? (
            <>
              <div className="minimal-error-icon">❌</div>
              <p className="minimal-error-text">{error}</p>
              {onRetry && (
                <button className="minimal-retry-btn" onClick={onRetry}>
                  🔄 Retry
                </button>
              )}
            </>
          ) : (
            <>
              <div className="minimal-spinner"></div>
              <p className="minimal-text">{message}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Render compact variant
  if (variant === 'compact') {
    return (
      <div className={`app-loader-overlay theme-${theme} variant-compact ${error ? 'has-error' : ''}`}>
        <div className="compact-loader">
          {error ? (
            <>
              <div className="compact-error-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
              </div>
              <h2 className="compact-error-title">Connection Failed</h2>
              <p className="compact-error-message">{error}</p>
              {onRetry && (
                <button className="compact-retry-btn" onClick={onRetry}>
                  <span>🔄</span> Retry Connection
                </button>
              )}
            </>
          ) : (
            <>
              <div className="compact-logo-ring">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" className="compact-ring-bg" />
                  <circle cx="50" cy="50" r="45" className="compact-ring-progress" 
                    style={{ strokeDashoffset: 283 - (283 * currentProgress) / 100 }} />
                </svg>
                <div className="compact-logo-icon">🏨</div>
              </div>
              <h2 className="compact-title">{hostelName}</h2>
              <p className="compact-message">{displayMessage}</p>
              {currentProgress > 0 && (
                <div className="compact-progress-text">{Math.round(currentProgress)}%</div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`app-loader-overlay theme-${theme} ${showContent ? 'content-visible' : ''} ${isExiting ? 'fade-out' : ''} ${error ? 'has-error' : ''}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* ==================== ANIMATED BACKGROUND ==================== */}
      <div className="loader-background">
        {/* Gradient Orbs */}
        <div 
          className={`gradient-orb orb-1 ${error ? 'error-mode' : ''}`}
          style={{
            transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`
          }}
        ></div>
        <div 
          className={`gradient-orb orb-2 ${error ? 'error-mode' : ''}`}
          style={{
            transform: `translate(${mousePosition.x * -0.3}px, ${mousePosition.y * -0.3}px)`
          }}
        ></div>
        <div 
          className={`gradient-orb orb-3 ${error ? 'error-mode' : ''}`}
          style={{
            transform: `translate(${mousePosition.x * 0.2}px, ${mousePosition.y * 0.2}px)`
          }}
        ></div>

        {/* Mesh Grid */}
        <div className="mesh-grid"></div>

        {/* Floating Shapes */}
        {!error && (
          <div className="floating-shapes">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className={`floating-shape shape-${(i % 4) + 1}`}
                style={{
                  '--delay': `${i * 0.5}s`,
                  '--duration': `${15 + i * 2}s`,
                  '--x': `${Math.random() * 100}%`,
                  '--y': `${Math.random() * 100}%`,
                  '--size': `${20 + Math.random() * 40}px`,
                  '--rotation': `${Math.random() * 360}deg`
                }}
              ></div>
            ))}
          </div>
        )}

        {/* Particle Field */}
        {!error && (
          <div className="particle-field">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  '--delay': `${Math.random() * 5}s`,
                  '--duration': `${4 + Math.random() * 6}s`,
                  '--x-start': `${Math.random() * 100}%`,
                  '--size': `${2 + Math.random() * 4}px`,
                  '--opacity': 0.3 + Math.random() * 0.7
                }}
              ></div>
            ))}
          </div>
        )}

        {/* Radial Pulse Waves */}
        {!error && (
          <div className="pulse-waves">
            <div className="pulse-wave wave-1"></div>
            <div className="pulse-wave wave-2"></div>
            <div className="pulse-wave wave-3"></div>
          </div>
        )}

        {/* Aurora Effect */}
        {!error && (
          <div className="aurora-container">
            <div className="aurora aurora-1"></div>
            <div className="aurora aurora-2"></div>
            <div className="aurora aurora-3"></div>
          </div>
        )}

        {/* Noise Overlay */}
        <div className="noise-overlay"></div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="app-loader-content">
        
        {/* Top Section - Time & Status */}
        <div className="loader-top-bar">
          <div className={`status-indicator ${error ? 'error' : ''}`}>
            <span className={`status-dot ${error ? 'error' : ''}`}></span>
            <span className="status-text">
              {error ? 'Connection failed' : 'Connecting securely'}
            </span>
          </div>
          <div className="elapsed-time">
            <span className="time-icon">⏱️</span>
            <span className="time-value">{formatTime(elapsedTime)}</span>
          </div>
        </div>

        {/* ==================== ERROR STATE ==================== */}
        {error ? (
          <div className="error-state">
            <div className="error-icon-container">
              <div className="error-icon-bg"></div>
              <div className="error-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <div className="error-pulse-ring"></div>
            </div>
            
            <h2 className="error-title">Connection Failed</h2>
            <p className="error-message">{error}</p>
            
            <div className="error-details">
              <div className="error-detail-item">
                <span className="error-detail-icon">🔌</span>
                <span className="error-detail-text">Backend server is not responding</span>
              </div>
              <div className="error-detail-item">
                <span className="error-detail-icon">⏱️</span>
                <span className="error-detail-text">Tried for {formatTime(elapsedTime)}</span>
              </div>
            </div>

            {onRetry && (
              <button className="retry-button" onClick={onRetry}>
                <span className="retry-icon">🔄</span>
                <span className="retry-text">Retry Connection</span>
                <div className="retry-shine"></div>
              </button>
            )}

            <div className="error-help">
              <p className="error-help-title">💡 Troubleshooting Tips:</p>
              <ul className="error-help-list">
                <li>Try restarting the application</li>
                <li>Check if antivirus is blocking the connection</li>
                <li>Ensure no other instance is running</li>
                <li>Contact support if the issue persists</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            {/* ==================== LOGO SECTION ==================== */}
            <div 
              className="loader-logo-section"
              style={{
                transform: `translate(${mousePosition.x * 0.1}px, ${mousePosition.y * 0.1}px)`
              }}
            >
              <div className="logo-wrapper">
                {/* Outer Glow */}
                <div className="logo-outer-glow"></div>
                
                {/* Hexagon Container */}
                <div className="logo-hexagon-container">
                  <svg className="hexagon-bg" viewBox="0 0 200 200">
                    <defs>
                      <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--loader-accent)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--loader-accent-2)" stopOpacity="0.1" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <polygon 
                      points="100,10 180,55 180,145 100,190 20,145 20,55" 
                      fill="url(#hexGradient)"
                      stroke="var(--loader-accent)"
                      strokeWidth="1"
                      opacity="0.5"
                      className="hexagon-shape"
                    />
                  </svg>
                </div>

                {/* Multi-Ring System */}
                <div className="ring-system">
                  <svg className="ring ring-1" viewBox="0 0 200 200">
                    <defs>
                      <linearGradient id="ring1Grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4ade80" />
                        <stop offset="50%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#16a34a" />
                      </linearGradient>
                    </defs>
                    <circle 
                      cx="100" cy="100" r="90"
                      fill="none"
                      stroke="url(#ring1Grad)"
                      strokeWidth="2"
                      strokeDasharray="565"
                      strokeLinecap="round"
                      filter="url(#glow)"
                    />
                  </svg>

                  <svg className="ring ring-2" viewBox="0 0 200 200">
                    <defs>
                      <linearGradient id="ring2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                    <circle 
                      cx="100" cy="100" r="75"
                      fill="none"
                      stroke="url(#ring2Grad)"
                      strokeWidth="2"
                      strokeDasharray="471"
                      strokeLinecap="round"
                    />
                  </svg>

                  <svg className="ring ring-3" viewBox="0 0 200 200">
                    <defs>
                      <linearGradient id="ring3Grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f472b6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <circle 
                      cx="100" cy="100" r="60"
                      fill="none"
                      stroke="url(#ring3Grad)"
                      strokeWidth="1.5"
                      strokeDasharray="377"
                      strokeLinecap="round"
                    />
                  </svg>

                  <svg className="ring ring-4" viewBox="0 0 200 200">
                    <circle 
                      cx="100" cy="100" r="45"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="1"
                    />
                  </svg>
                </div>

                {/* Center Logo */}
                <div className="logo-center">
                  <div className="logo-glow-effect"></div>
                  <div className="logo-icon-container">
                    {logo ? (
                      <img src={logo} alt="Logo" className="custom-logo" />
                    ) : (
                      <div className="default-logo">
                        <svg viewBox="0 0 48 48" className="hostel-svg-icon">
                          <defs>
                            <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#ffffff" />
                              <stop offset="100%" stopColor="#e2e8f0" />
                            </linearGradient>
                          </defs>
                          <path 
                            d="M6 42V18L24 6L42 18V42H30V28H18V42H6Z" 
                            fill="url(#iconGrad)"
                            className="icon-main-path"
                          />
                          <rect x="20" y="20" width="8" height="6" rx="1" fill="var(--loader-primary)" className="icon-window"/>
                          <circle cx="24" cy="12" r="2" fill="var(--loader-accent)" className="icon-sun"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Orbiting Elements */}
                <div className="orbit-system">
                  <div className="orbit orbit-1">
                    <div className="orbit-object"><span>📚</span></div>
                  </div>
                  <div className="orbit orbit-2">
                    <div className="orbit-object"><span>🎓</span></div>
                  </div>
                  <div className="orbit orbit-3">
                    <div className="orbit-object"><span>🏆</span></div>
                  </div>
                  <div className="orbit orbit-4">
                    <div className="orbit-object"><span>💡</span></div>
                  </div>
                </div>

                {/* Corner Decorations */}
                <div className="corner-decorations">
                  <div className="corner corner-tl"></div>
                  <div className="corner corner-tr"></div>
                  <div className="corner corner-bl"></div>
                  <div className="corner corner-br"></div>
                </div>
              </div>
            </div>

            {/* ==================== TITLE SECTION ==================== */}
            <div className="loader-title-section">
              <h1 className="loader-main-title">
                <span className="title-decorator left">✦</span>
                {hostelName.split('').map((char, i) => (
                  <span 
                    key={i} 
                    className={`title-char ${char === ' ' ? 'space' : ''}`}
                    style={{ '--char-index': i, '--total-chars': hostelName.length }}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                ))}
                <span className="title-decorator right">✦</span>
              </h1>
              
              <div className="loader-tagline">
                <div className="tagline-line left"></div>
                <p className="tagline-text">
                  {tagline.split('').map((char, i) => (
                    <span 
                      key={i} 
                      className="tagline-char"
                      style={{ '--char-index': i }}
                    >
                      {char === ' ' ? '\u00A0' : char}
                    </span>
                  ))}
                </p>
                <div className="tagline-line right"></div>
              </div>
            </div>

            {/* ==================== LOADING PHASES ==================== */}
            <div className="loading-phases">
              {phases.map((phase, i) => (
                <div 
                  key={phase.name}
                  className={`phase-item ${i < loadingPhase ? 'completed' : ''} ${i === loadingPhase ? 'active' : ''}`}
                >
                  <div 
                    className="phase-icon"
                    style={{ '--phase-color': phase.color }}
                  >
                    {i < loadingPhase ? '✓' : phase.icon}
                  </div>
                  <span className="phase-name">{phase.name}</span>
                  {i < phases.length - 1 && <div className="phase-connector"></div>}
                </div>
              ))}
            </div>

            {/* ==================== ADVANCED SPINNER ==================== */}
            <div className="advanced-spinner">
              <div className="spinner-container">
                <div className="spinner-ring spinner-ring-1"></div>
                <div className="spinner-ring spinner-ring-2"></div>
                <div className="spinner-core">
                  <div className="core-pulse"></div>
                </div>
              </div>
              <div className="spinner-dots">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i} 
                    className="spinner-dot"
                    style={{ '--dot-index': i }}
                  ></div>
                ))}
              </div>
            </div>

            {/* ==================== MESSAGE SECTION ==================== */}
            <div className="loader-message-section">
              <div className="message-container">
                <span className="message-icon">💬</span>
                <p className="loader-message">
                  {displayMessage}
                  {isTyping && <span className="typing-cursor"></span>}
                </p>
              </div>

              {showTips && (
                <div className="tips-carousel">
                  <div className="tip-item" key={currentTip}>
                    <span className="tip-icon">{loadingTips[currentTip].icon}</span>
                    <span className="tip-text">{loadingTips[currentTip].text}</span>
                  </div>
                </div>
              )}
            </div>

            {/* ==================== PROGRESS SECTION ==================== */}
            {(progress !== null || autoProgress) && (
              <div className="progress-section">
                <div className="progress-wrapper">
                  {/* Circular Progress */}
                  <div className="circular-progress">
                    <svg viewBox="0 0 120 120">
                      <defs>
                        <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="var(--loader-accent)" />
                          <stop offset="100%" stopColor="var(--loader-accent-2)" />
                        </linearGradient>
                      </defs>
                      <circle 
                        cx="60" cy="60" r="54"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="8"
                      />
                      <circle 
                        cx="60" cy="60" r="54"
                        fill="none"
                        stroke="url(#progressGrad)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="339"
                        strokeDashoffset={339 - (339 * currentProgress) / 100}
                        transform="rotate(-90 60 60)"
                        className="progress-circle"
                      />
                    </svg>
                    <div className="progress-percentage">
                      <span className="percentage-value">{Math.round(currentProgress)}</span>
                      <span className="percentage-symbol">%</span>
                    </div>
                  </div>

                  {/* Linear Progress */}
                  <div className="linear-progress-container">
                    <div className="linear-progress-bar">
                      <div 
                        className="linear-progress-fill"
                        style={{ width: `${currentProgress}%` }}
                      >
                        <div className="progress-shimmer"></div>
                      </div>
                      <div 
                        className="progress-glow-dot"
                        style={{ left: `${currentProgress}%` }}
                      ></div>
                    </div>
                    <div className="progress-labels">
                      <span className="progress-status">{getProgressStatus()}</span>
                      {estimatedTime && (
                        <span className="progress-eta">
                          ETA: ~{Math.max(0, estimatedTime - elapsedTime)}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Milestones */}
                <div className="progress-milestones">
                  {[0, 25, 50, 75, 100].map((milestone) => (
                    <div 
                      key={milestone}
                      className={`milestone ${currentProgress >= milestone ? 'reached' : ''}`}
                      style={{ left: `${milestone}%` }}
                    >
                      <div className="milestone-dot"></div>
                      <span className="milestone-label">{milestone}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ==================== STATS SECTION ==================== */}
            {showStats && (
              <div className="stats-section">
                <div className="stats-grid">
                  {stats.map((stat, i) => (
                    <div 
                      key={stat.label}
                      className="stat-card"
                      style={{ '--card-index': i }}
                    >
                      <span className="stat-icon">{stat.icon}</span>
                      <span className="stat-value">{stat.value}</span>
                      <span className="stat-label">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ==================== QUOTES SECTION ==================== */}
            {showQuotes && (
              <div className="quotes-section">
                <div className="quote-card" key={currentQuote}>
                  <span className="quote-mark">"</span>
                  <p className="quote-text">{quotes[currentQuote].text}</p>
                  <p className="quote-author">— {quotes[currentQuote].author}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================== FOOTER ==================== */}
        <div className="loader-footer">
          <div className="footer-wave-container">
            <svg className="footer-wave" viewBox="0 0 1440 120" preserveAspectRatio="none">
              <path 
                d="M0,64 C288,89 576,25 864,56 C1152,87 1296,48 1440,64 L1440,120 L0,120 Z"
                fill="rgba(255,255,255,0.03)"
              />
              <path 
                d="M0,80 C360,110 720,40 1080,72 C1260,88 1380,60 1440,80 L1440,120 L0,120 Z"
                fill="rgba(255,255,255,0.02)"
              />
            </svg>
          </div>
          
          <div className="footer-content">
            <div className={`security-badge ${error ? 'error' : ''}`}>
              <span className="security-icon">{error ? '⚠️' : '🔒'}</span>
              <span className="security-text">
                {error ? 'Connection Issue' : '256-bit SSL Encrypted'}
              </span>
            </div>
            <div className="footer-divider">•</div>
            <div className="version-info">
              <span>v2.0.0</span>
            </div>
          </div>

          <p className="copyright-text">
            © {new Date().getFullYear()} {hostelName}. All rights reserved.
          </p>
        </div>
      </div>

      {/* ==================== CORNER ACCENTS ==================== */}
      <div className="corner-accents">
        <div className="accent accent-tl">
          <svg viewBox="0 0 100 100">
            <path d="M0,50 Q0,0 50,0" fill="none" stroke="var(--loader-accent)" strokeWidth="2" opacity="0.3"/>
            <circle cx="50" cy="0" r="4" fill="var(--loader-accent)" opacity="0.5"/>
          </svg>
        </div>
        <div className="accent accent-tr">
          <svg viewBox="0 0 100 100">
            <path d="M50,0 Q100,0 100,50" fill="none" stroke="var(--loader-accent)" strokeWidth="2" opacity="0.3"/>
            <circle cx="50" cy="0" r="4" fill="var(--loader-accent)" opacity="0.5"/>
          </svg>
        </div>
        <div className="accent accent-bl">
          <svg viewBox="0 0 100 100">
            <path d="M0,50 Q0,100 50,100" fill="none" stroke="var(--loader-accent)" strokeWidth="2" opacity="0.3"/>
            <circle cx="50" cy="100" r="4" fill="var(--loader-accent)" opacity="0.5"/>
          </svg>
        </div>
        <div className="accent accent-br">
          <svg viewBox="0 0 100 100">
            <path d="M50,100 Q100,100 100,50" fill="none" stroke="var(--loader-accent)" strokeWidth="2" opacity="0.3"/>
            <circle cx="50" cy="100" r="4" fill="var(--loader-accent)" opacity="0.5"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default AppLoader;