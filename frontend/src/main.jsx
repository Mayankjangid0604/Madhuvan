import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./styles/theme-premium.css";

// Prevent mouse wheel from changing the value of focused <input type="number">
// (a common source of accidental fee/amount edits when the user is just scrolling).
document.addEventListener(
  "wheel",
  (e) => {
    const t = e.target;
    if (
      t &&
      t.tagName === "INPUT" &&
      t.type === "number" &&
      document.activeElement === t
    ) {
      t.blur();
    }
  },
  { passive: true }
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);