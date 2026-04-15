import { useContext, useCallback } from 'react';
import { AppStateContext, AppDispatchContext } from '../utilities/stateManager';
import type { NotificationType } from '../types/types';

export function useAppStore() {
  const state  = useContext(AppStateContext);
  const dispatch  = useContext(AppDispatchContext);
  if (!state || !dispatch) throw new Error('useAppStore must be used within AppProvider');
  
  // Expose notification helper directly

    const notify = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Date.now().toString();
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id, message, type, timestamp: Date.now(), count: 1 } });
    window.setTimeout(() => dispatch({ type: 'REMOVE_ACTIVE_NOTIFICATION', payload: id }), 5000);
  }, [dispatch]);

  return { state, dispatch, notify };
}