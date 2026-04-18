import { useReducer } from 'react';
import { AppStateContext, AppDispatchContext, appReducer, initialState  } from './utilities/stateManager';
import {Application} from './pages/index';

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