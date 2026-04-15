import { useContext, useCallback } from 'react';
import { AppStateContext, AppDispatchContext } from '../utilities/stateManager';
import type { NotificationType } from '../types/types';

export function useAppStore() {
  const state  = useContext(AppStateContext);
  const dispatch  = useContext(AppDispatchContext);
  if (!state || !dispatch) throw new Error('useAppStore must be used within AppProvider');
  
  // Expose notification helper directly
  const notify = useCallback((message: string, type:NotificationType = 'info') => {
    const id = Date.now().toString();
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id, message, type } });
    setTimeout(() => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
    }, 5000); // Auto dismiss
  }, [dispatch]);

  return { state, dispatch, notify };
}