import { useState, useEffect, useCallback, useRef } from "react";
import {
  joinTicketChannel,
  leaveTicketChannel,
  onTicketEvent,
  broadcastTypingStart,
  broadcastTypingStop,
} from "@/services/realtime";

export function useTypingIndicator(ticketId, currentUser) {
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!ticketId) return;

    joinTicketChannel(ticketId);

    const unsubs = [
      onTicketEvent(ticketId, "typing:start", (data) => {
        if (data.userId !== currentUser?.id) {
          setTypingUsers((prev) => {
            if (prev.some((u) => u.userId === data.userId)) return prev;
            return [...prev, { userId: data.userId, userName: data.userName }];
          });
        }
      }),
      onTicketEvent(ticketId, "typing:stop", (data) => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
      setTypingUsers([]);
      leaveTicketChannel(ticketId);
    };
  }, [ticketId, currentUser?.id]);

  const startTyping = useCallback(() => {
    if (!ticketId || !currentUser || isTypingRef.current) return;
    isTypingRef.current = true;
    broadcastTypingStart(ticketId, currentUser.id, currentUser.full_name || currentUser.email);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      broadcastTypingStop(ticketId, currentUser.id);
    }, 3000);
  }, [ticketId, currentUser]);

  const stopTyping = useCallback(() => {
    if (!ticketId || !currentUser) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;
    broadcastTypingStop(ticketId, currentUser.id);
  }, [ticketId, currentUser]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return { typingUsers, startTyping, stopTyping };
}
