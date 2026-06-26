import { useState, useEffect, useCallback, createContext, useContext } from "react";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = ++toastId;
    const newToast = { id, ...toast, open: true };
    setToasts(prev => [...prev, newToast]);

    const duration = toast.duration || 3000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);

    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");

  const toast = useCallback(({ title, description, variant = "default", duration = 3000 }) => {
    return context.addToast({ title, description, variant, duration });
  }, [context]);

  return {
    toast,
    dismiss: context.dismissToast,
    toasts: context.toasts,
  };
}
