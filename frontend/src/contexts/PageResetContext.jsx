import { createContext, useContext, useState } from 'react';

const PageResetContext = createContext();

export const PageResetProvider = ({ children }) => {
  const [resetTrigger, setResetTrigger] = useState(0);

  const triggerPageReset = () => {
    setResetTrigger(prev => prev + 1);
  };

  return (
    <PageResetContext.Provider value={{ resetTrigger, triggerPageReset }}>
      {children}
    </PageResetContext.Provider>
  );
};

export const usePageReset = () => {
  const context = useContext(PageResetContext);
  if (!context) {
    throw new Error('usePageReset must be used within PageResetProvider');
  }
  return context;
};