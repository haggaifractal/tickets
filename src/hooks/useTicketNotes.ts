import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, onSnapshot, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { TicketNote } from '@/types/models';

export function useTicketNotes(ticketId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['ticket_notes', ticketId];

  const fetchNotes = async (): Promise<TicketNote[]> => {
    if (!ticketId) return [];
    
    // Notes are stored in /tickets/{ticketId}/notes
    const q = query(
      collection(db, 'tickets', ticketId, 'notes'), 
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketNote));
  };

  const queryInfo = useQuery<TicketNote[], Error>({
    queryKey,
    queryFn: fetchNotes,
    staleTime: Infinity, 
    enabled: !!ticketId,
  });

  useEffect(() => {
    if (!ticketId) return;

    const q = query(
      collection(db, 'tickets', ticketId, 'notes'), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketNote));
      queryClient.setQueryData(queryKey, notes);
    }, (error) => {
      console.error("Firestore Ticket Notes Subscription Error:", error);
    });

    return () => unsubscribe();
  }, [queryClient, ticketId]);

  return queryInfo;
}

export function useTicketNoteMutations(ticketId: string | undefined) {
  const createNote = useMutation({
    mutationFn: async (note: Omit<TicketNote, 'id' | 'createdAt' | 'ticketId'>) => {
      if (!ticketId) throw new Error("Ticket ID required");
      
      const docRef = await addDoc(collection(db, 'tickets', ticketId, 'notes'), {
        ...note,
        ticketId,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    }
  });

  return { createNote };
}
