import { createContext, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const push = (message, type = 'info') => {
    const id = Date.now();
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), 3500);
  };

  const value = useMemo(() => ({ push }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[60] space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded px-3 py-2 text-sm text-white shadow ${item.type === 'error' ? 'bg-red-500' : 'bg-slate-800'}`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
