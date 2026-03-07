

# Plan : Forcer la regeneration du Plan OVO

## Probleme

Deux blocages empechent la mise a jour du Plan OVO :

1. **Pipeline global** (`handleGenerate`, ligne 170-175) : skippe tout module qui a deja des donnees riches. Comme `plan_ovo` a des donnees (anciennes, base_year 2023), il est systematiquement ignore.

2. **Pipeline global ne supporte pas `force`** : contrairement a `generate-deliverables` (edge function), le frontend n'envoie jamais `force: true` pour ecraser les donnees existantes.

La generation individuelle (`handleGenerateModule`) devrait fonctionner mais les logs montrent 0 appels reussis, ce qui suggere un probleme cote frontend (erreur silencieuse ou mauvais mapping).

## Corrections

### 1. Ajouter un parametre `force` a la generation globale

Dans `EntrepreneurDashboard.tsx` et `CoachDashboard.tsx`, modifier `handleGenerate` pour accepter un parametre `force` qui ignore le check de donnees existantes :

```typescript
const handleGenerate = async (force = false) => {
  // ...
  // Ligne 170-175 : ajouter condition force
  if (!force && existing?.data && ...) {
    continue; // skip
  }
```

Connecter le bouton de regeneration globale existant pour passer `force: true` quand l'utilisateur clique explicitement sur "Regenerer".

### 2. Verifier le mapping individuel

S'assurer que quand l'utilisateur clique sur le bouton de regeneration du module Plan OVO, la fonction `generate-plan-ovo` est bien appelee et les erreurs sont correctement affichees (pas d'erreur silencieuse).

### 3. Appliquer la meme correction dans CoachDashboard

Meme logique de `force` pour le dashboard coach.

## Impact
- Un fichier principal modifie : `EntrepreneurDashboard.tsx` (~5 lignes)
- Un fichier secondaire : `CoachDashboard.tsx` (~5 lignes)  
- Apres correction, relancer la generation globale ou individuelle produira un nouveau Plan OVO avec les annees 2024-2031 et les contraintes framework

