import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../components/theme-provider';
import { updateProfile } from 'firebase/auth';
import { useUsers } from '../hooks/useUsers';
import { UserRole, AppUser } from '../types/models';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sun, Moon, Monitor, User, ShieldAlert, Palette, Shield } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { users, isLoading, updateRole, updateProfileData, isUpdatingProfile: isUpdatingDbProfile } = useUsers();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [priorityEmployeeId, setPriorityEmployeeId] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const currentUserProfile = users?.find(u => u.uid === user?.uid);
  const currentUserRole = currentUserProfile?.role || 'tech';
  const isAdmin = currentUserRole === 'admin';

  useEffect(() => {
    if (currentUserProfile) {
      setPhone(currentUserProfile.phone || '');
      setPriorityEmployeeId(currentUserProfile.priorityEmployeeId || '');
    }
  }, [currentUserProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsUpdatingProfile(true);
    try {
      if (user.displayName !== displayName) {
        await updateProfile(user, { displayName });
      }
      if (currentUserProfile) {
        await updateProfileData({ uid: user.uid, data: { displayName, phone, priorityEmployeeId } });
      } else {
        toast.success('Firebase Auth updated, but firestore profile not found directly yet.');
      }
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error('Failed to update profile: ' + error.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    if (!isAdmin) return;
    // Don't let the user demote themselves directly easily to prevent lockouts,
    // though for testing they might want to.
    if (uid === user?.uid && newRole !== 'admin') {
      const confirm = window.confirm("Are you sure you want to remove your own admin privileges?");
      if (!confirm) return;
    }
    
    await updateRole({ uid, role: newRole });
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role Management
            </TabsTrigger>
          )}
        </TabsList>
        
        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details here.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ''} disabled />
                  <p className="text-xs text-muted-foreground">Email is managed by authentication provider.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input 
                    id="name" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    placeholder="John Doe" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="e.g. +972-50-1234567" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priorityEmployeeId">Priority ERP Employee ID</Label>
                  <Input 
                    id="priorityEmployeeId" 
                    value={priorityEmployeeId} 
                    onChange={(e) => setPriorityEmployeeId(e.target.value)} 
                    placeholder="e.g. E001" 
                  />
                </div>
                <Button type="submit" disabled={isUpdatingProfile || isUpdatingDbProfile}>
                  {isUpdatingProfile || isUpdatingDbProfile ? 'Updating...' : 'Save Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>Customize the look and feel of your dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-4 max-w-sm">
                <Label>System Theme</Label>
                <Select value={theme} onValueChange={(val: any) => setTheme(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center">
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Light</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center">
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Dark</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center">
                        <Monitor className="mr-2 h-4 w-4" />
                        <span>System Settings</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users / RBAC Tab */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Role Management</CardTitle>
                <CardDescription>Manage access roles for technicians and administrators.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading users...</p>
                ) : (
                  <div className="rounded-md border">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Email</th>
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="px-4 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users?.map((appUser) => (
                          <tr key={appUser.uid} className="border-b border-border last:border-0 hover:bg-muted/50">
                            <td className="px-4 py-3 font-medium">{appUser.displayName || 'No Name'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{appUser.email}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                appUser.role === 'admin' 
                                  ? 'bg-primary/20 text-primary' 
                                  : appUser.role === 'pending'
                                    ? 'bg-amber-500/20 text-amber-600'
                                    : 'bg-secondary text-secondary-foreground'
                              }`}>
                                {appUser.role ? appUser.role.toUpperCase() : 'PENDING'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Select 
                                value={appUser.role || 'pending'} 
                                onValueChange={(val: UserRole) => handleRoleChange(appUser.uid, val)}
                              >
                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="tech">Technician</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                        {(!users || users.length === 0) && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                              No users found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div className="mt-4 flex items-center justify-between p-4 bg-amber-500/10 text-amber-500 rounded-md border border-amber-500/20">
                  <div className="flex items-center">
                    <ShieldAlert className="h-5 w-5 mr-3" />
                    <div className="text-sm">
                      <p className="font-semibold">Security Warning</p>
                      <p>Admins have full access to all client data, asset data, and user roles.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

      </Tabs>
    </div>
  );
}
