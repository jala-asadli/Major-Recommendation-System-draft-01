import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserProfile } from '../types';

interface ProtectedRouteProps extends PropsWithChildren {
  user: UserProfile | null;
}

export const ProtectedRoute = ({ user, children }: ProtectedRouteProps) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};
