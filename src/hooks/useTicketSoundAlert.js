import { db } from '@/api/flowdeskClient';
import { supabase } from '@/lib/supabase';

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

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
  } catch (e) {}
}

function playCustomSound(url) {
  if (!url) { playBeep(); return; }
  try {
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.play().catch(() => playBeep());
  } catch (e) {
    playBeep();
  }
}

export function useTicketSoundAlert() {
  const knownIds = useRef(null);

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets-sound-watch"],
    queryFn: () => db.entities.Ticket.list("-created_date", 50),
    refetchInterval: 300000,
  });

  const { data: soundSettings = [] } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data } = await supabase.from('system_settings').select('*');
      return data || [];
    },
    refetchInterval: false,
  });

  const soundMap = {};
  soundSettings.forEach(s => { soundMap[s.key] = s.value; });

  useEffect(() => {
    if (!tickets.length) return;

    const currentIds = new Set(tickets.map(t => t.id));

    if (knownIds.current === null) {
      knownIds.current = currentIds;
      return;
    }

    let hasNew = false;
    for (const id of currentIds) {
      if (!knownIds.current.has(id)) {
        hasNew = true;
        break;
      }
    }

    if (hasNew) {
      if (soundMap.sound_new_ticket_enabled === 'true') {
        playCustomSound(soundMap.sound_new_ticket_url);
      }
      knownIds.current = currentIds;
    } else {
      knownIds.current = currentIds;
    }
  }, [tickets, soundSettings]);
}