import React, { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

const toastState: ToastState = {
  toasts: []
};

const listeners: Array<(state: ToastState) => void> = [];

function dispatch(action: { type: string; toast?: Toast; id?: string }) {
  switch (action.type) {
    case 'ADD_TOAST':
      if (action.toast) {
        toastState.toasts.push(action.toast);
      }
      break;
    case 'REMOVE_TOAST':
      toastState.toasts = toastState.toasts.filter(t => t.id !== action.id);
      break;
    case 'CLEAR_TOASTS':
      toastState.toasts = [];
      break;
  }
  
  listeners.forEach(listener => listener(toastState));
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function useToast() {
  const [state, setState] = useState<ToastState>(toastState);

  const subscribe = useCallback((listener: (state: ToastState) => void) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    const id = generateId();
    const toastItem: Toast = {
      id,
      duration: 5000,
      ...props
    };

    dispatch({ type: 'ADD_TOAST', toast: toastItem });

    // Auto remove after duration
    if (toastItem.duration && toastItem.duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_TOAST', id });
      }, toastItem.duration);
    }

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', id });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR_TOASTS' });
  }, []);

  // Subscribe to state changes
  React.useEffect(() => {
    const unsubscribe = subscribe(setState);
    return unsubscribe;
  }, [subscribe]);

  return {
    toast,
    dismiss,
    clear,
    toasts: state.toasts
  };
}

// For backward compatibility
export const toast = (props: Omit<Toast, 'id'>) => {
  const id = generateId();
  const toastItem: Toast = {
    id,
    duration: 5000,
    ...props
  };

  dispatch({ type: 'ADD_TOAST', toast: toastItem });

  if (toastItem.duration && toastItem.duration > 0) {
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', id });
    }, toastItem.duration);
  }

  return id;
};