import { useAppStore } from "../hooks/useAppStore";
import { Icons } from "./icons";

export const NotificationCenter: React.FC = () => {
  const { state, dispatch } = useAppStore();

  return (
    <div 
      aria-live="polite" 
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {state.notifications.map(note => (
        <div key={note.id} 
          className={`pointer-events-auto flex items-center justify-between p-4 rounded-lg shadow-lg text-white transform transition-all duration-300 translate-y-0 opacity-100
            ${note.type === 'success' ? 'bg-green-600' : 
              note.type === 'error' ? 'bg-red-600' : 
              note.type === 'warning' ? 'bg-amber-500' : 'bg-blue-600'}`}
        >
          <div className="flex items-center gap-3">
            {note.type === 'success' ? <Icons.Check className="w-5 h-5"/> : note.type === 'error' ? <Icons.Alert className="w-5 h-5"/> : null}
            <p className="text-sm font-medium">{note.message}</p>
          </div>
          <button 
            onClick={() => dispatch({ type: 'REMOVE_NOTIFICATION', payload: note.id })}
            className="text-white/80 hover:text-white" aria-label="Close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};