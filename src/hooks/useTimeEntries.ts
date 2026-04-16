import { useQuery } from "@tanstack/react-query";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/config/firebase";

export interface TimeEntry {
  id: string;
  ticketId: string;
  techId: string;
  durationMinutes: number;
  date: Date;
  billing_locked: boolean;
}

export function useTimeEntries() {
  return useQuery({
    queryKey: ['timeEntries'],
    queryFn: async () => {
      // Query all time entries and sort mapped results by descending date
      const q = query(
        collection(db, "time_entries")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate() || new Date()
        };
      }).sort((a, b) => b.date.getTime() - a.date.getTime()) as TimeEntry[];
    }
  });
}
