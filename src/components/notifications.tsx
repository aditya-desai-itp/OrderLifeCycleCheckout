import { useAppStore } from "../hooks/useAppStore";
import { Icons } from "./icons";

export const NotificationCenter: React.FC = () => {
  const { state, dispatch } = useAppStore();

  return (
    <div 
      aria-live="polite" 
      className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {state.activeNotifications.map(note => (
        <div key={note.id} 
          className={`pointer-events-auto flex items-center justify-between p-4 rounded-sm shadow-lg text-white font-medium border-l-4 
            ${note.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-50' : 
              note.type === 'error' ? 'bg-rose-950 border-rose-500 text-rose-50' : 
              note.type === 'warning' ? 'bg-amber-950 border-amber-500 text-amber-50' : 
              'bg-neutral-900 border-neutral-500 text-neutral-50'}`}
        >
          <div className="flex items-center gap-3">
             <p className="text-sm font-medium">{note.count > 1 && <span className="font-bold bg-black/40 px-2 py-0.5 rounded-sm mr-3 text-xs">{note.count}x</span>}{note.message}</p>
          </div>
          <button 
            onClick={() => dispatch({ type: 'REMOVE_ACTIVE_NOTIFICATION', payload: note.id })}
            className="text-white/60 hover:text-white pl-4" aria-label="Dismiss"
          >
            <Icons.Close className="w-4 h-4"/>
          </button>
        </div>
      ))}
    </div>
  );
};