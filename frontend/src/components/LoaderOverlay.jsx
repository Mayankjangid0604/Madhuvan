import "./loaders/appLoader.css";

export default function LoaderOverlay({ show, theme = "dark" }) {
  if (!show) return null;

  return (
    <div className={`app-loader-overlay theme-${theme}`}>
      <div className="app-loader-content">
        <div className="loader-title">Loading</div>
        <div className="loader-spinner-container">
          <div className="spinner-track">
            <div className="spinner-dot-container">
              <div className="spinner-dot" style={{ "--dot-index": 0 }} />
              <div className="spinner-dot" style={{ "--dot-index": 1 }} />
              <div className="spinner-dot" style={{ "--dot-index": 2 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}