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
      {/* Backdrop */}
      {state.isNotificationPanelOpen && (
        <div className="fixed inset-0 bg-slate-900/30 z-40 transition-opacity" onClick={() => dispatch({ type: 'TOGGLE_NOTIFICATION_PANEL', payload: false })} />
      )}
      
      {/* Sidebar Panel */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-700 flex flex-col ${state.isNotificationPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Icons.Bell className="w-5 h-5 text-blue-600" /> Notifications
          </h2>
          <button onClick={() => dispatch({ type: 'TOGGLE_NOTIFICATION_PANEL', payload: false })} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex gap-2 overflow-x-auto hide-scrollbar">
          {['all', 'success', 'warning', 'error', 'info'].map((f) => (
            <button key={f} onClick={() => setFilter(f as any)} className={`px-3 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredHistory.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 mt-10 text-sm">No notifications found.</p>
          ) : (
            filteredHistory.map((note, idx) => (
              <div key={`${note.id}-${idx}`} className={`p-3 rounded-lg border flex gap-3 items-start ${
                note.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-300' :
                note.type === 'error' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300' :
                note.type === 'warning' ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/50 text-orange-800 dark:text-orange-300' :
                'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300'
              }`}>
                {note.type === 'success' ? <Icons.Check className="w-5 h-5 flex-shrink-0 mt-0.5"/> : <Icons.Alert className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="text-sm font-medium leading-tight">{note.message}</p>
                  <p className="text-xs opacity-70 mt-1">{new Date(note.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
        
        {state.notificationHistory.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <Button variant="outline" className="w-full text-sm py-2" onClick={() => dispatch({ type: 'CLEAR_NOTIFICATION_HISTORY' })}>
              Clear History
            </Button>
          </div>
        )}
      </div>
    </>
  );
};