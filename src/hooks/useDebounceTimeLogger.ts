import { useState, useRef, useEffect, useCallback } from 'react';
import { useTicketMutations } from './useTickets';
import { toast } from 'sonner';

export function useDebounceTimeLogger(debounceMs: number = 5000) {
  const { logTicketTime } = useTicketMutations();
  const [pendingLogs, setPendingLogs] = useState<Record<string, number>>({});
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    return () => {
      // Clear timeouts on unmount to prevent memory leaks / state updates on unmounted components
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, []);

  const addTime = useCallback((ticketId: string, minutes: number) => {
    setPendingLogs(prev => ({
      ...prev,
      [ticketId]: (prev[ticketId] || 0) + minutes
    }));

    if (timeoutRefs.current[ticketId]) {
      clearTimeout(timeoutRefs.current[ticketId]);
    }

    timeoutRefs.current[ticketId] = setTimeout(async () => {
      // Capture the amount and clear from pending state
      let amountToLog = 0;
      setPendingLogs(prev => {
        amountToLog = prev[ticketId] || 0;
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });

      if (amountToLog !== 0) {
        logTicketTime.mutateAsync({ ticketId, additionalMinutes: amountToLog })
          .then(() => toast.success(`Logged ${amountToLog > 0 ? '+' : ''}${amountToLog}m successfully`))
          .catch((e: any) => toast.error(`Failed to log time: ${e.message}`));
      }
      
      delete timeoutRefs.current[ticketId];
    }, debounceMs);
  }, [logTicketTime, debounceMs]);

  return { addTime, pendingLogs };
}
