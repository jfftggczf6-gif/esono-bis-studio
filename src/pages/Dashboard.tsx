import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import CoachDashboard from '@/components/dashboard/CoachDashboard';
import EntrepreneurDashboard from '@/components/dashboard/EntrepreneurDashboard';

export default function Dashboard() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!role) return <Navigate to="/select-role" replace />;

  return role === 'coach' ? <CoachDashboard /> : <EntrepreneurDashboard />;
}
