import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from './DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Building2, CheckCircle2, Clock } from 'lucide-react';

export default function CoachDashboard() {
  const { user, profile } = useAuth();
  const [enterprises, setEnterprises] = useState<any[]>([]);
  const [modulesMap, setModulesMap] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!user) return;
    const fetchEnterprises = async () => {
      const { data } = await supabase
        .from('enterprises')
        .select('*')
        .eq('coach_id', user.id);
      setEnterprises(data || []);

      if (data && data.length > 0) {
        const ids = data.map(e => e.id);
        const { data: mods } = await supabase
          .from('enterprise_modules')
          .select('*')
          .in('enterprise_id', ids);

        const map: Record<string, any[]> = {};
        (mods || []).forEach(m => {
          if (!map[m.enterprise_id]) map[m.enterprise_id] = [];
          map[m.enterprise_id].push(m);
        });
        setModulesMap(map);
      }
    };
    fetchEnterprises();
  }, [user]);

  const totalEntreprises = enterprises.length;
  const completedModules = Object.values(modulesMap).flat().filter(m => m.status === 'completed').length;
  const totalModules = Object.values(modulesMap).flat().length;

  return (
    <DashboardLayout
      title={`Bonjour, ${profile?.full_name || 'Coach'} 👋`}
      subtitle="Tableau de bord de coaching"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{totalEntreprises}</p>
              <p className="text-xs text-muted-foreground">Entrepreneurs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{completedModules}</p>
              <p className="text-xs text-muted-foreground">Modules terminés</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{totalModules - completedModules}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">
                {totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Progression</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entrepreneurs list */}
      <h2 className="text-lg font-display font-semibold mb-4">Vos entrepreneurs</h2>
      {enterprises.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p>Aucun entrepreneur assigné pour le moment.</p>
            <p className="text-sm mt-1">Les entrepreneurs vous seront assignés par l'administrateur.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {enterprises.map(ent => {
            const mods = modulesMap[ent.id] || [];
            const completed = mods.filter(m => m.status === 'completed').length;
            const total = mods.length || 8;
            const pct = Math.round((completed / total) * 100);

            return (
              <Card key={ent.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold">{ent.name}</h3>
                      <p className="text-sm text-muted-foreground">{ent.sector || 'Secteur non défini'} • {ent.city || ent.country}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium">{completed}/{total} modules</p>
                      <Progress value={pct} className="h-1.5 w-24 mt-1" />
                    </div>
                    <Badge variant={pct === 100 ? 'default' : 'outline'}>{pct}%</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
