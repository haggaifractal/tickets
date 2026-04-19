import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, query, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";

export interface TimeEntry {
  id: string;
  ticketId: string;
  techId: string;
  durationMinutes: number;
  date: Date;
  description: string;
  billing_locked: boolean;
  priority_synced?: boolean;
  priority_error?: string;
}

export const TIME_ENTRIES_QUERY_KEY = ['timeEntries'];

export function useTimeEntries() {
  const queryClient = useQueryClient();

  const fetchTimeEntries = async () => {
    // Query all time entries and sort mapped results by descending date
    const q = query(collection(db, "time_entries"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date()
      };
    }).sort((a: any, b: any) => b.date.getTime() - a.date.getTime()) as TimeEntry[];
  };

  const queryInfo = useQuery({
    queryKey: TIME_ENTRIES_QUERY_KEY,
    queryFn: fetchTimeEntries,
    staleTime: Infinity,
  });

  useEffect(() => {
    const q = query(collection(db, "time_entries"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate() || new Date()
        };
      }).sort((a: any, b: any) => b.date.getTime() - a.date.getTime()) as TimeEntry[];
      
      queryClient.setQueryData(TIME_ENTRIES_QUERY_KEY, entries);
    }, (error) => {
      console.error("Firestore TimeEntries Subscription Error:", error);
    });

    return () => unsubscribe();
  }, [queryClient]);

  return queryInfo;
}
