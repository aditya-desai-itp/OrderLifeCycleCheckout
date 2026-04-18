import React, { useState } from "react";
import { useAppStore } from "../hooks/useAppStore";
import type { NotificationType } from "../types/types";
import { Icons } from "./icons";
import { Button } from "./buttons";

export const NotificationPanel: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [filter, setFilter] = useState<'all' | NotificationType>('all');

  const filteredHistory = state.notificationHistory.filter(n => filter === 'all' || n.type === filter);
  return (
    <>
    {state.isNotificationPanelOpen && <div className="fixed inset-0 bg-neutral-950/50 backdrop-blur-sm z-[80]" onClick={() => dispatch({ type: 'TOGGLE_NOTIFICATION_PANEL', payload: false })} />}
        <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-neutral-900 shadow-2xl z-[85] transform transition-transform duration-300 ${state.isNotificationPanelOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
            <h2 className="font-serif text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2"><Icons.Bell /> Activity</h2>
            <button onClick={() => dispatch({ type: 'TOGGLE_NOTIFICATION_PANEL', payload: false })} aria-label="Close panel" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"><Icons.Close className="w-6 h-6"/></button>
          </div>

          {/* NOTIFICATION FILTER BAR */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex gap-3 overflow-x-auto custom-scrollbar bg-neutral-50 dark:bg-neutral-950">
            {['all', 'success', 'warning', 'error', 'info'].map((f) => {
              const isActive = filter === f;
              const activeColor =
                f === 'success' ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50' :
                f === 'error' ? 'border-rose-500 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50' :
                f === 'warning' ? 'border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50' :
                f === 'info' ? 'border-neutral-700 text-neutral-900 dark:text-neutral-100 bg-neutral-200 dark:bg-neutral-800' :
                'border-neutral-500 text-neutral-900 dark:text-neutral-100 bg-neutral-200 dark:bg-neutral-800';

              return (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                    isActive
                      ? activeColor
                      : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {filteredHistory.length === 0 ? (
              <p className="text-center text-neutral-500 dark:text-neutral-400 mt-10 text-sm italic">No notifications found.</p>
            ) : (
              filteredHistory.map((note, idx) => (
                <div key={`${note.id}-${idx}`} className={`p-4 border border-l-4 rounded-sm text-sm text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 
                  ${note.type === 'success' ? 'border-l-emerald-500 dark:border-l-emerald-500' : note.type === 'error' ? 'border-l-rose-500 dark:border-l-rose-500' : note.type === 'warning' ? 'border-l-amber-500 dark:border-l-amber-500' : 'border-l-neutral-500 dark:border-l-neutral-500'}`}>
                  {note.count > 1 && <span className="font-bold bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded-sm mr-2 text-xs">{note.count}x</span>}
                  {note.message} <span className="text-xs text-neutral-500 block mt-2 uppercase tracking-widest">{new Date(note.timestamp).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>

          {state.notificationHistory.length > 0 && (
            <Button variant="outline" className="m-6 py-3 uppercase tracking-widest text-xs" onClick={() => dispatch({ type: 'CLEAR_NOTIFICATION_HISTORY' })}>Clear History</Button>
          )}
        </div>
  </>
  )
};