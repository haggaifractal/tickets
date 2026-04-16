import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Client } from '@/types/models';

export const CLIENTS_QUERY_KEY = ['clients'];

export function useClients() {
  const queryClient = useQueryClient();

  const fetchClients = async (): Promise<Client[]> => {
    const q = query(collection(db, 'clients'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
  };

  const queryInfo = useQuery<Client[], Error>({
    queryKey: CLIENTS_QUERY_KEY,
    queryFn: fetchClients,
    staleTime: Infinity, 
  });

  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      queryClient.setQueryData(CLIENTS_QUERY_KEY, clients);
    }, (error) => {
      console.error("Firestore Clients Subscription Error:", error);
    });

    return () => unsubscribe();
  }, [queryClient]);

  return queryInfo;
}

export function useClientMutations() {
  const queryClient = useQueryClient();

  const createClient = useMutation({
    mutationFn: async (client: Omit<Client, 'id'>) => {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, 'clients'), {
        ...client,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    }
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Client> & { id: string }) => {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'clients', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
    }
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'clients', id));
    }
  });

  return { createClient, updateClient, deleteClient };
}
