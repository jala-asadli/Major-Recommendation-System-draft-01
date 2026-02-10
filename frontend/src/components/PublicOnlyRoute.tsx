import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserProfile } from '../types';

interface PublicOnlyRouteProps extends PropsWithChildren {
  user: UserProfile | null;
}

export const PublicOnlyRoute = ({ user, children }: PublicOnlyRouteProps) => {
  if (user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};
