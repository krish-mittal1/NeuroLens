import { createContext, useContext, useState } from "react";

/**
 * Session Context for tracking user interactions across landing page features
 * Logs activities from Risk Estimator, MRI Viewer, Anatomy Explorer, and Clinical Chat
 */
const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [sessionLogs, setSessionLogs] = useState([]);

  const addLog = (logEntry) => {
    setSessionLogs((prev) => [...prev, { ...logEntry, timestamp: Date.now() }]);
  };

  return (
    <SessionContext.Provider value={{ sessionLogs, addLog }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    console.warn("useSession called outside SessionProvider - returning mock context");
    return { sessionLogs: [], addLog: () => {} };
  }
  return context;
}
