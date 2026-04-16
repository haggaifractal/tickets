import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AppUser, UserRole } from '../types/models';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const useUsers = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // We fetch users assuming the user's token/role check will handle authorization backend-side
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      return snapshot.docs.map(doc => ({
        ...doc.data()
      })) as AppUser[];
    },
    enabled: !!user // Only fetch if authenticated
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ uid, role }: { uid: string; role: UserRole }) => {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User role updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating user role:', error);
      toast.error(error.message || 'Failed to update user role');
    }
  });

  const createUserProfileMutation = useMutation({
    mutationFn: async ({ 
      uid, 
      email, 
      displayName, 
      role = 'tech' 
    }: { 
      uid: string; 
      email: string; 
      displayName: string; 
      role?: UserRole 
    }) => {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const newUser: AppUser = {
          uid,
          email,
          displayName,
          role,
          createdAt: serverTimestamp()
        };
        await setDoc(userRef, newUser);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const updateProfileDataMutation = useMutation({
    mutationFn: async ({ uid, data }: { uid: string; data: Partial<AppUser> }) => {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    }
  });

  return {
    users,
    isLoading,
    error,
    updateRole: updateRoleMutation.mutateAsync,
    isUpdatingRole: updateRoleMutation.isPending,
    createUserProfile: createUserProfileMutation.mutateAsync,
    updateProfileData: updateProfileDataMutation.mutateAsync,
    isUpdatingProfile: updateProfileDataMutation.isPending
  };
};
