import { useState, useEffect, useCallback, useRef } from "react";

export function useTypingIndicator(ticketId, currentUser) {
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const socketRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    import("@/services/socket").then(({ getSocketConnection }) => {
      if (mounted) socketRef.current = getSocketConnection();
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ticketId || !socketRef.current) return;
    const s = socketRef.current;

    const handleTypingStart = (data) => {
      if (data.ticketId === ticketId && data.userId !== currentUser?.id) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, userName: data.userName }];
        });
      }
    };

    const handleTypingStop = (data) => {
      if (data.ticketId === ticketId) {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }
    };

    s.on("typing:start", handleTypingStart);
    s.on("typing:stop", handleTypingStop);

    return () => {
      s.off("typing:start", handleTypingStart);
      s.off("typing:stop", handleTypingStop);
      setTypingUsers([]);
    };
  }, [ticketId, currentUser?.id]);

  const startTyping = useCallback(() => {
    if (!ticketId || !currentUser || isTypingRef.current) return;
    isTypingRef.current = true;
    const s = socketRef.current;
    if (s) {
      s.emit("typing:start", {
        ticketId,
        userId: currentUser.id,
        userName: currentUser.full_name || currentUser.email,
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      if (s) s.emit("typing:stop", { ticketId, userId: currentUser.id });
    }, 3000);
  }, [ticketId, currentUser]);

  const stopTyping = useCallback(() => {
    if (!ticketId || !currentUser) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;
    const s = socketRef.current;
    if (s) s.emit("typing:stop", { ticketId, userId: currentUser.id });
  }, [ticketId, currentUser]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return { typingUsers, startTyping, stopTyping };
}
