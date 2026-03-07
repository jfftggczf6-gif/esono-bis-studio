
Objectif validé: corriger la régénération via le bouton du module OVO pour garantir la sortie du fichier Excel (.xlsm) avec projections complètes (sans zéros anormaux en années futures) et sans erreurs ambiguës.

Constats issus du code actuel
- Le bouton “Régénérer” du module OVO appelle bien `handleGenerateOvoPlan()` (Excel) → fonction backend `generate-ovo-plan`.
- Le message “Erreur de parsing IA” vient du helper partagé `callAI` (utilisé par `generate-diagnostic` / `generate-plan-ovo`), pas du moteur Excel OVO direct.
- Le moteur Excel OVO réinjecte des contraintes “NE PAS MODIFIER” depuis `plan_ovo_data` (ancien plan). Si ce plan contient des zéros/stale sur Y4-Y6, ces zéros sont propagés dans l’Excel.
- Côté front, `handleGenerateOvoPlan` traite actuellement toute erreur HTTP (même 500 métier) comme une “coupure réseau” et bascule en polling, ce qui masque la vraie cause.

Plan d’implémentation proposé

1) Corriger la gestion d’erreur front du bouton OVO (priorité haute)
- Fichier: `src/components/dashboard/EntrepreneurDashboard.tsx`
- Séparer clairement:
  - Erreur HTTP non-OK (ex: 400/500) => afficher immédiatement l’erreur serveur exacte.
  - Vraie erreur réseau/timeout => fallback polling.
- Afficher un message utilisateur explicite “Échec génération OVO Excel” + `request_id` quand disponible.

2) Empêcher la propagation des données “stale” vers l’Excel OVO
- Fichier: `supabase/functions/generate-ovo-plan/index.ts`
- Ajouter une étape `sanitizePrevPlanConstraints()` avant `buildUserPrompt`:
  - Valider `plan_ovo_data.revenue/cogs/ebitda/cashflow` sur YEAR2..YEAR6.
  - Si séries invalides (zéros structurants, trou de projection), ne pas imposer ces contraintes “NE PAS MODIFIER”.
  - Rebasculer automatiquement sur les contraintes fiables:
    - `framework_data.projection_5ans`
    - `inputs_data.compte_resultat`
- Résultat: le générateur Excel ne sera plus verrouillé par d’anciens chiffres incohérents.

3) Durcir la robustesse IA du flux OVO Excel
- Fichier: `supabase/functions/generate-ovo-plan/index.ts`
- Garder la stratégie retry existante, mais ajouter un fallback “prompt compact” si parse échoue:
  - 1er essai: prompt enrichi actuel.
  - 2e essai: prompt réduit (moins narratif, mêmes champs obligatoires).
- Limiter la taille de certains blocs injectés (diagnostic, bmc texte libre) pour éviter troncature de sortie.

4) Ajouter de la traçabilité opérationnelle
- Fichier: `supabase/functions/generate-ovo-plan/index.ts`
- Enregistrer dans `deliverables(type=plan_ovo_excel).data`:
  - `phase` (collect_context / ai_call / parse / inject / upload)
  - `constraint_source` (prev_plan | framework_fallback)
  - `request_id`
- Permettra de diagnostiquer rapidement si un futur échec vient des contraintes, du parse IA, ou de l’injection Excel.

5) Vérification fonctionnelle de bout en bout
- Cas test A: clic “Régénérer” dans module OVO avec plan_ovo ancien/incomplet.
  - Attendu: fichier .xlsm généré, projections YEAR4-YEAR6 non bloquées à zéro (sauf cas métier réel).
- Cas test B: simuler une erreur IA.
  - Attendu: erreur claire affichée immédiatement (pas de faux fallback “connexion interrompue”).
- Cas test C: régénération répétée.
  - Attendu: statut `completed` cohérent, téléchargement fonctionnel.

Flux cible après correction
```text
Bouton module OVO
  -> handleGenerateOvoPlan
      -> generate-ovo-plan
          -> sanitize constraints (anti-stale)
          -> AI (retry + compact fallback)
          -> expand + inject XLSM
          -> upload + signed URL
  -> UI: succès clair / erreur claire
```

Détails techniques (résumé)
- Frontend:
  - `src/components/dashboard/EntrepreneurDashboard.tsx` (gestion erreur/fallback)
- Backend:
  - `supabase/functions/generate-ovo-plan/index.ts` (sanitization, fallback prompt, metadata)
- Base de données:
  - Aucune migration nécessaire.
