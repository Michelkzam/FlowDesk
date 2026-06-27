import React, { useState, useEffect } from "react";
import { Bell, X, MessageSquare, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeNotifications, checkNewNotifications, getNotifications, clearNotifications } from "@/lib/notifications";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export default function NotificationBell() {
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeNotifications(setNotifs);
    const interval = setInterval(checkNewNotifications, 30000);
    checkNewNotifications();
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const unread = notifs.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="p-2 rounded-lg hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground dark:text-zinc-400 relative transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center leading-none px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Notificações</h3>
              {notifs.length > 0 && (
                <button onClick={() => { clearNotifications(); setNotifs([]); }} className="text-xs text-muted-foreground hover:text-foreground">
                  Limpar tudo
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma notificação</p>
              ) : (
                notifs.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { setOpen(false); if (n.type === 'ticket') navigate('/tickets/todos'); else if (n.type === 'message') navigate('/chat/chats'); }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type === 'ticket' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                      {n.type === 'ticket' ? <Ticket className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                      {n.time && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{format(new Date(n.time), "HH:mm", { locale: ptBR })}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
