

## Plan : Comment tester + Ajouter un bouton supprimer

### Comment tester les modifications

Pour tester, il suffit de :
1. **Se deconnecter** du compte actuel (bouton deconnexion dans le dashboard)
2. **Se reconnecter avec le compte coach** (`philyace@gmail.com`) — sur le dashboard, "MORINGA GOLD TOGO" devrait apparaitre avec ses 12 livrables et 8 modules
3. **Se reconnecter avec le compte entrepreneur** (`philippeyace@hotmail.fr`) — verifier que tout est intact de son cote

**Note importante** : La migration precedente a corrige les policies RLS et le nettoyage des donnees a ete effectue. Si "MORINGA GOLD TOGO" n'apparait toujours pas cote coach, cela signifie que la migration de donnees (DELETE du doublon + UPDATE du coach_id) n'a pas ete executee — il faudra alors la relancer.

### Ajout du bouton Supprimer un entrepreneur

Actuellement, la table `enterprises` n'a **aucune policy DELETE** — il est impossible de supprimer une entreprise meme depuis le code.

#### Modifications necessaires :

**1. Migration SQL** :
- Ajouter une policy DELETE sur `enterprises` pour les coaches (`coach_id = auth.uid()`)
- Ajouter une policy DELETE sur `enterprise_modules` et `deliverables` (cascade logique quand on supprime une entreprise)

```sql
-- Coaches can delete enterprises they are assigned to
CREATE POLICY "Coaches can delete assigned enterprises"
ON public.enterprises FOR DELETE
USING (auth.uid() = coach_id);

-- Allow cascade delete of modules
CREATE POLICY "Users can delete modules of own enterprises"
ON public.enterprise_modules FOR DELETE
USING (EXISTS (
  SELECT 1 FROM enterprises e
  WHERE e.id = enterprise_modules.enterprise_id
  AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())
));

-- Allow cascade delete of deliverables
CREATE POLICY "Users can delete deliverables of own enterprises"
ON public.deliverables FOR DELETE
USING (EXISTS (
  SELECT 1 FROM enterprises e
  WHERE e.id = deliverables.enterprise_id
  AND (e.user_id = auth.uid() OR e.coach_id = auth.uid())
));
```

**2. Modifier `CoachDashboard.tsx`** :
- Ajouter une fonction `handleDeleteEnterprise` qui :
  - Affiche une confirmation (AlertDialog)
  - Supprime les `coach_uploads` lies
  - Supprime les `deliverables` lies
  - Supprime les `enterprise_modules` lies
  - Supprime l'entreprise
  - Rafraichit la liste
- Ajouter un bouton poubelle (icone `Trash2`) sur chaque carte d'entreprise dans la liste, avec confirmation avant suppression

**Important** : Pour les entreprises liees a un entrepreneur existant (`user_id != coach_id`), le bouton "Supprimer" ne fera que **detacher** le coach (mettre `coach_id = null`) plutot que supprimer l'entreprise, afin de ne pas effacer les donnees de l'entrepreneur.

### Fichiers a modifier
- **Migration SQL** : policies DELETE
- **`src/components/dashboard/CoachDashboard.tsx`** : fonction de suppression + bouton avec confirmation

