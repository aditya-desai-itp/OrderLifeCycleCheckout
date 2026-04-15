import './App.css'
import { useReducer } from 'react';
import { AppStateContext, AppDispatchContext, appReducer, initialState  } from './utilities/stateManager';
import {Application} from './pages/index';
import type { Action } from './types/types';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        <Application />
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}