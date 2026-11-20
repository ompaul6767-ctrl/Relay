import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isCheckingSession } = useAuth();
  const location = useLocation();

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-navy-950 text-slate-800 dark:text-slate-100 p-4 transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-navy-900 via-teal-700 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20 animate-pulse mb-4">
          <Sparkles size={24} />
        </div>
        <div className="flex items-center space-x-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying session...</span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Securing Relay handover workspace
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect unauthenticated visitors to /login and preserve destination in state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
