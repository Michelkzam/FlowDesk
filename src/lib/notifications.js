import { supabase } from '@/lib/supabase';

let notifications = [];
let listeners = [];
let lastCheck = 0;

export function subscribeNotifications(callback) {
  listeners.push(callback);
  return () => { listeners = listeners.filter(l => l !== callback); };
}

function notify(notifications) {
  listeners.forEach(l => l(notifications));
}

export async function checkNewNotifications() {
  const now = Date.now();
  if (now - lastCheck < 30000) return;
  lastCheck = now;
  try {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, number, title, status, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: messages } = await supabase
      .from('ticket_messages')
      .select('id, ticket_id, sender_type, body, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const newNotifications = [];

    (tickets || []).forEach(t => {
      const ts = new Date(t.created_at).getTime();
      if (ts > lastCheck - 60000) {
        newNotifications.push({
          id: `ticket-${t.id}`,
          type: 'ticket',
          title: `Novo ticket: ${t.number || '#' + t.id?.slice(0, 6)}`,
          message: t.title,
          time: t.created_at,
        });
      }
    });

    (messages || []).forEach(m => {
      const ts = new Date(m.created_at).getTime();
      if (ts > lastCheck - 60000 && m.sender_type !== 'operator') {
        newNotifications.push({
          id: `msg-${m.id}`,
          type: 'message',
          title: 'Nova mensagem',
          message: m.body?.substring(0, 80) || '',
          time: m.created_at,
        });
      }
    });

    if (newNotifications.length > 0) {
      notifications = [...newNotifications, ...notifications].slice(0, 50);
      notify(notifications);
    }
  } catch {}
}

export function getNotifications() {
  return notifications;
}

export function clearNotifications() {
  notifications = [];
  notify([]);
}
