import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Asset } from '@/types/models';

export const ASSETS_QUERY_KEY = ['assets'];

export function useAssets() {
  const queryClient = useQueryClient();

  const fetchAssets = async (): Promise<Asset[]> => {
    const q = query(collection(db, 'assets'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
  };

  const queryInfo = useQuery<Asset[], Error>({
    queryKey: ASSETS_QUERY_KEY,
    queryFn: fetchAssets,
    staleTime: Infinity, 
  });

  useEffect(() => {
    const q = query(collection(db, 'assets'), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      queryClient.setQueryData(ASSETS_QUERY_KEY, assets);
    }, (error) => {
      console.error("Firestore Assets Subscription Error:", error);
    });

    return () => unsubscribe();
  }, [queryClient]);

  return queryInfo;
}

export function useAssetMutations() {
  const queryClient = useQueryClient();

  const createAsset = useMutation({
    mutationFn: async (asset: Omit<Asset, 'id'>) => {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, 'assets'), {
        ...asset,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    }
  });

  const updateAsset = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Asset> & { id: string }) => {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'assets', id), {
        ...data,
      });
    }
  });

  const deleteAsset = useMutation({
    mutationFn: async (id: string) => {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'assets', id));
    }
  });

  return { createAsset, updateAsset, deleteAsset };
}
