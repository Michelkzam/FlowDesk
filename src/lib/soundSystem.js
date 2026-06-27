import { supabase } from '@/lib/supabase';

let soundCache = null;
let cacheTime = 0;
const CACHE_TTL = 30000;

async function getSoundSettings() {
  const now = Date.now();
  if (soundCache && (now - cacheTime) < CACHE_TTL) return soundCache;
  try {
    const { data } = await supabase.from('system_settings').select('*');
    const map = {};
    (data || []).forEach(s => { map[s.key] = s.value; });
    soundCache = map;
    cacheTime = now;
    return map;
  } catch {
    return {};
  }
}

export function invalidateSoundCache() {
  soundCache = null;
  cacheTime = 0;
}

export async function playSystemSound(type) {
  try {
    const settings = await getSoundSettings();
    const enabledKey = `sound_${type}_enabled`;
    const urlKey = `sound_${type}_url`;
    if (settings[enabledKey] !== 'true') return;
    let url = settings[urlKey];
    if (!url) return;
    try { const parsed = JSON.parse(url); url = parsed.url; } catch {}
    if (!url) return;
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
}
