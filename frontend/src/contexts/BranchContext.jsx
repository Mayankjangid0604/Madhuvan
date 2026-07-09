import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const BranchContext = createContext(null);

export const BranchProvider = ({ children }) => {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    const stored = localStorage.getItem("selectedBranchId");
    return stored ? Number(stored) : null;
  });

  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

  const loadBranches = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`${API_URL}/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = res.data?.data || [];
      setBranches(list);
      if (!selectedBranchId && list.length) {
        const def = list.find((b) => b.is_default) || list[0];
        setSelectedBranchId(def.branch_id);
        localStorage.setItem("selectedBranchId", String(def.branch_id));
      }
    } catch (err) {
      // Silent fail — branches are optional
    }
  }, [API_URL, selectedBranchId]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const selectBranch = useCallback((id) => {
    setSelectedBranchId(id);
    localStorage.setItem("selectedBranchId", String(id));
    // Reload the app so all pages refetch under the new branch
    window.dispatchEvent(new Event("branch-changed"));
  }, []);

  const currentBranch = branches.find((b) => b.branch_id === selectedBranchId) || null;

  return (
    <BranchContext.Provider
      value={{ branches, selectedBranchId, currentBranch, selectBranch, reloadBranches: loadBranches }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
};

export default BranchContext;
