

## Plan: Enrichir la preview Plan OVO avec des indicateurs d'investissement (VAN, TRI, CAGR, etc.)

### Objectif
Ajouter une section **"Indicateurs de décision d'investissement"** au PlanOvoViewer avec les métriques financières clés que les investisseurs attendent : VAN (NPV), TRI (IRR), CAGR, ROI, Payback Period, DSCR.

### Changements

**1. Enrichir le prompt IA (`generate-plan-ovo/index.ts`)**
Ajouter au JSON demandé un bloc `investment_metrics` :
```json
"investment_metrics": {
  "van": 0,           // Valeur Actuelle Nette (taux d'actualisation 12%)
  "tri": 0,           // Taux de Rendement Interne (%)
  "cagr_revenue": 0,  // CAGR du CA (%)
  "cagr_ebitda": 0,   // CAGR de l'EBITDA (%)
  "roi": 0,           // Retour sur investissement (%)
  "payback_years": 0, // Délai de récupération (années)
  "dscr": 0,          // Debt Service Coverage Ratio
  "multiple_ebitda": 0 // Valorisation / EBITDA
}
```
Demander aussi à l'IA de les calculer dans les 3 scénarios (optimiste/réaliste/pessimiste).

**2. Ajouter les calculs côté frontend (`PlanOvoViewer.tsx`)**
En fallback si l'IA ne fournit pas `investment_metrics`, calculer automatiquement depuis les séries existantes :
- **CAGR** : `(valeur_finale / valeur_initiale)^(1/n) - 1` sur revenue et EBITDA
- **VAN** : somme des cashflows actualisés à 12% moins investissement initial (funding_need + CAPEX)
- **TRI** : recherche itérative du taux qui annule la VAN (méthode Newton simplifiée)
- **ROI** : `(cumul net_profit) / investissement_total`
- **Payback** : première année où cashflow cumulé > investissement
- **DSCR** : EBITDA / service de la dette annuel

**3. Nouvelles sections UI dans `PlanOvoViewer.tsx`**
- **Card "Indicateurs d'investissement"** : grille 2x4 avec VAN, TRI, CAGR Revenue, CAGR EBITDA, ROI, Payback, DSCR, Multiple EBITDA — chacun avec code couleur (vert/orange/rouge selon seuils)
- **Tableau comparatif scénarios enrichi** : ajouter VAN et TRI par scénario dans la section existante
- **Jauge visuelle TRI vs coût du capital** (barre de progression simple)

### Fichiers modifiés
- `supabase/functions/generate-plan-ovo/index.ts` — enrichir le prompt JSON
- `src/components/dashboard/PlanOvoViewer.tsx` — calculs fallback + nouvelles sections UI

