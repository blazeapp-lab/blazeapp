import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';

interface AdminRouteProps {
  children: React.ReactNode;
  requireModerator?: boolean;
}

export const AdminRoute = ({ children, requireModerator = false }: AdminRouteProps) => {
  const navigate = useNavigate();
  const { isAdmin, isModerator, loading } = useAdmin();

  useEffect(() => {
    // Wait for loading to complete
    if (loading) return;

    // Check if user has required permissions
    const hasAccess = isAdmin || (requireModerator && isModerator);
    
    if (!hasAccess) {
      // Redirect to home immediately
      navigate('/', { replace: true });
    }
  }, [isAdmin, isModerator, loading, navigate, requireModerator]);

  // Show loading state while checking permissions
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-lg">Verifying permissions...</div>
      </div>
    );
  }

  // Don't render admin content if user doesn't have access
  const hasAccess = isAdmin || (requireModerator && isModerator);
  if (!hasAccess) {
    return null;
  }

  // User has access, render the admin content
  return <>{children}</>;
};
