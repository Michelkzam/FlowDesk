import { db } from '@/api/flowdeskClient';

import React, { useState, useEffect } from "react";
import { Bell, LogOut, User, Sun, Moon, Pause, Play } from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTheme } from "@/lib/ThemeContext";
import { Link } from "react-router-dom";
import GlobalSearch from "@/components/shared/GlobalSearch";

const REFRESH_INTERVAL = 300;

export default function TopBar() {
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [paused, setPaused] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => db.auth.me(),
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets-open-count"],
    queryFn: () => db.entities.Ticket.filter({ status: "open" }, "-created_date", 500),
  });

  useEffect(() => {
    if (paused) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          queryClient.invalidateQueries({ queryKey: ["tickets"] });
          queryClient.invalidateQueries({ queryKey: ["tickets-open-count"] });
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [queryClient, paused]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const progress = ((REFRESH_INTERVAL - countdown) / REFRESH_INTERVAL) * 100;

  const openCount = tickets.length;
  const { theme, toggle } = useTheme();

  const today = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  const roleLabel = user?.role === "admin" ? "Administrador" : "Técnico";

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-border dark:border-zinc-700 h-14 flex items-center justify-between px-4 gap-3">
      <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground dark:text-zinc-400 shrink-0">
        <span>{todayCapitalized}</span>
      </div>

      <div className="flex-1 flex justify-center px-2 max-w-xl mx-auto">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggle}
          className="p-2 rounded-lg hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground dark:text-zinc-400 transition-colors"
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <Link to="/tickets/todos" className="p-2 rounded-lg hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground dark:text-zinc-400 relative">
          <Bell className="w-4 h-4" />
          {openCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center leading-none px-1">
              {openCount > 99 ? "99+" : openCount}
            </span>
          )}
        </Link>

        {/* Countdown Timer */}
        <button
          onClick={() => setPaused(p => !p)}
          className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title={paused ? "Retomar atualização automática" : "Pausar atualização automática"}
        >
          <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/50 dark:text-zinc-700" />
            <circle
              cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeDasharray="94.25"
              strokeDashoffset={paused ? 94.25 : 94.25 - (94.25 * progress) / 100}
              strokeLinecap="round"
              className={cn("transition-all duration-1000", paused ? "text-muted-foreground dark:text-zinc-500" : "text-primary")}
            />
          </svg>
          <span className={cn("absolute text-[10px] font-bold", paused ? "text-muted-foreground dark:text-zinc-500" : "text-green-600 dark:text-green-400")}>
            {paused ? <Pause className="w-3 h-3" /> : `${minutes}:${seconds.toString().padStart(2, '0')}`}
          </span>
        </button>

        <div className="flex items-center gap-2 pl-2 ml-1 border-l border-border dark:border-zinc-700">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-tight text-gray-900 dark:text-zinc-100">{user?.full_name || user?.email || "Usuario"}</p>
            <p className="text-xs text-muted-foreground dark:text-zinc-400">{roleLabel}</p>
          </div>
        </div>

        <button
          className="p-2 rounded-lg hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground dark:text-zinc-400 hover:text-red-500 transition-colors ml-1"
          title="Sair do sistema"
          onClick={() => db.auth.logout("/")}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
