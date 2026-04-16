import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export const Login: React.FC = () => {
  const { user, loginWithGoogle } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-surface-container border border-white/5 shadow-2xl">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto bg-primary/20 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4">
            <ShieldAlert className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">IT Service Portal</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Sign in to access the MSP Operations system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full h-12 text-md font-semibold transition-all hover:scale-[1.02]" 
            onClick={loginWithGoogle}
          >
            Sign in with Workspace
          </Button>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-muted-foreground max-w-xs text-center leading-relaxed">
        Authorized personnel only. All access is logged and recorded in compliance with the Israeli Privacy Protection Law.
      </p>
    </div>
  );
};
