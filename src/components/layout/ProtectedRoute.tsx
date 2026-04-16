import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, UserRole } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="mt-4 text-muted-foreground text-sm font-medium tracking-wide">
          Authenticating NOC/SOC secure access...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated but not assigned ANY role yet, block access
  if (user && !role) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-card p-8 rounded-lg border shadow-lg text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Access Denied 🔒</h2>
          <p className="text-muted-foreground text-sm">
            Your account (<span className="block font-medium text-foreground mt-1">{user.email}</span>) 
            is awaiting approval.
          </p>
          <p className="text-muted-foreground text-sm">
            Please contact your system administrator to assign appropriate permissions.
          </p>
        </div>
      </div>
    );
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
