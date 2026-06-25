import { db } from '@/api/flowdeskClient';

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

// Plays a short beep using Web Audio API
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Audio not supported
  }
}

export function useTicketSoundAlert() {
  const knownIds = useRef(null);

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets-sound-watch"],
    queryFn: () => db.entities.Ticket.list("-created_date", 50),
    refetchInterval: 300000,
  });

  useEffect(() => {
    if (!tickets.length) return;

    const currentIds = new Set(tickets.map(t => t.id));

    if (knownIds.current === null) {
      // First load — just store, don't play
      knownIds.current = currentIds;
      return;
    }

    // Check for new tickets not previously known
    let hasNew = false;
    for (const id of currentIds) {
      if (!knownIds.current.has(id)) {
        hasNew = true;
        break;
      }
    }

    if (hasNew) {
      playBeep();
      knownIds.current = currentIds;
    } else {
      knownIds.current = currentIds;
    }
  }, [tickets]);
}