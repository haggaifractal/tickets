import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Ticket } from '@/types/models';

export const TICKETS_QUERY_KEY = ['tickets'];

export function useTickets() {
  const queryClient = useQueryClient();

  const fetchTickets = async (): Promise<Ticket[]> => {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
  };

  const queryInfo = useQuery<Ticket[], Error>({
    queryKey: TICKETS_QUERY_KEY,
    queryFn: fetchTickets,
    staleTime: Infinity, 
  });

  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
      queryClient.setQueryData(TICKETS_QUERY_KEY, tickets);
    }, (error) => {
      console.error("Firestore Tickets Subscription Error:", error);
    });

    return () => unsubscribe();
  }, [queryClient]);

  return queryInfo;
}

export function useTicketMutations() {
  const queryClient = useQueryClient();

  const createTicket = useMutation({
    mutationFn: async (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, 'tickets'), {
        ...ticket,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    }
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Ticket> & { id: string }) => {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'tickets', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
    }
  });

  const deleteTicket = useMutation({
    mutationFn: async (id: string) => {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'tickets', id));
    }
  });

  const logTicketTime = useMutation({
    mutationFn: async ({ ticketId, additionalMinutes, description }: { ticketId: string; additionalMinutes: number; description: string }) => {
      const { writeBatch, doc, collection, serverTimestamp, increment } = await import('firebase/firestore');
      const { auth } = await import('@/config/firebase');
      
      const user = auth.currentUser;
      if (!user) throw new Error("Unauthenticated");

      const batch = writeBatch(db);
      
      // Update ticket time
      const ticketRef = doc(db, 'tickets', ticketId);
      batch.update(ticketRef, {
        timeLoggedMinutes: increment(additionalMinutes),
        updatedAt: serverTimestamp()
      });

      // Write time entry
      if (additionalMinutes !== 0) {
        const entryRef = doc(collection(db, 'time_entries'));
        batch.set(entryRef, {
          ticketId,
          techId: user.uid,
          durationMinutes: additionalMinutes,
          date: serverTimestamp(),
          description,
          billing_locked: false 
        });
      }
      
      await batch.commit();
    }
  });

  const updateTicketTimeEntry = useMutation({
    mutationFn: async ({ entryId, ticketId, oldMinutes, newMinutes, newDescription }: { entryId: string; ticketId: string; oldMinutes: number; newMinutes: number; newDescription?: string }) => {
      const { writeBatch, doc, increment } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      const diff = newMinutes - oldMinutes;
      
      if (diff !== 0) {
        const ticketRef = doc(db, 'tickets', ticketId);
        batch.update(ticketRef, {
          timeLoggedMinutes: increment(diff)
        });
      }

      const entryRef = doc(db, 'time_entries', entryId);
      const entryUpdates: any = { durationMinutes: newMinutes };
      if (newDescription !== undefined) {
         entryUpdates.description = newDescription;
      }
      batch.update(entryRef, entryUpdates);
      
      await batch.commit();
    }
  });

  const deleteTicketTimeEntry = useMutation({
    mutationFn: async ({ entryId, ticketId, minutes }: { entryId: string; ticketId: string; minutes: number }) => {
      const { writeBatch, doc, increment } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      const ticketRef = doc(db, 'tickets', ticketId);
      batch.update(ticketRef, {
        timeLoggedMinutes: increment(-minutes)
      });

      const entryRef = doc(db, 'time_entries', entryId);
      batch.delete(entryRef);
      
      await batch.commit();
    }
  });

  return { createTicket, updateTicket, deleteTicket, logTicketTime, updateTicketTimeEntry, deleteTicketTimeEntry };
}
