import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext(null);

const applyThemeAttr = (theme) => {
  const root = document.documentElement;
  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
    root.style.colorScheme = "dark";
  } else {
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("app-theme");
    if (stored === "light" || stored === "dark") return stored;
    return "light";
  });

  useEffect(() => {
    applyThemeAttr(theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

export default ThemeContext;
