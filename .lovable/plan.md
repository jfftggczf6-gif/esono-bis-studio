

## Plan : Injecter les données réelles du Plan Financier Intermédiaire (framework) dans le prompt OVO

### Diagnostic

Les données en base sont riches et complètes :
- **framework_data** : `analyse_marge.activites` contient le CA et marge par produit (Poudre 68M, Gélules 28M, Huile 22M), `projection_5ans` avec 5 lignes de projection, `tresorerie_bfr` avec DSCR, CAF, etc.
- **plan_ovo** (JSON intermédiaire) : contient `revenue` par année (38M→72M→118M→145M→...→285M), `cogs`, `opex` détaillé, `capex`, `staff` — TOUT est là
- **BMC** : `flux_revenus` avec prix moyen (12 000 XOF/kg), volume (35 000 kg/an), CA mensuel

**Le problème** : le prompt envoie ces données en vrac (`JSON.stringify(data.framework_data)`) mais ne les structure pas en instructions exploitables pour l'IA. Claude reçoit un mur de JSON et ne sait pas quoi en faire pour remplir les `per_year` arrays avec les bons volumes et prix. Il génère donc des valeurs génériques ou nulles.

### Solution : Pré-calculer les données par produit et les injecter comme contraintes explicites

**Fichier** : `supabase/functions/generate-ovo-plan/index.ts` — fonction `buildUserPrompt`

1. **Extraire et injecter un bloc "REVENUS PAR PRODUIT" structuré** depuis `framework_data.analyse_marge.activites` et `plan_ovo_data.revenue` :
   ```
   REVENUS PAR PRODUIT (DONNÉES RÉELLES - À RESPECTER) :
   Produit 1: Poudre moringa export vrac — CA=68M FCFA (58% du CA total), marge=60%
   → Prix unitaire estimé: 12 000 XOF/kg, Volume estimé: 5 667 kg/an
   Produit 2: Gélules moringa bio — CA=28M FCFA (24%), marge=62%
   Produit 3: Huile cosmétique — CA=22M FCFA (18%), marge=62%
   ```

2. **Injecter les revenus historiques comme contrainte absolue** depuis `plan_ovo_data.revenue` :
   ```
   REVENUS HISTORIQUES (NE PAS MODIFIER) :
   YEAR-2: 38 000 000 FCFA
   YEAR-1: 72 000 000 FCFA
   CURRENT YEAR: 118 000 000 FCFA
   YEAR2: 145 000 000 FCFA → YEAR6: 285 000 000 FCFA
   ```

3. **Injecter les OPEX historiques détaillés** depuis `plan_ovo_data.opex` :
   ```
   OPEX HISTORIQUES (NE PAS MODIFIER) :
   Staff: YEAR-2=8.28M, YEAR-1=13.8M, CY=23M, Y2=29.4M...
   Marketing: YEAR-2=720K, YEAR-1=1.44M, CY=2.16M...
   [etc pour chaque poste]
   ```

4. **Injecter les CAPEX** depuis `plan_ovo_data.capex` et les données staff depuis `plan_ovo_data.staff`

5. **Ajouter une instruction de calcul inverse explicite** :
   ```
   CALCUL OBLIGATOIRE pour chaque produit actif :
   - volume = CA_produit / prix_unitaire
   - volume_h1 = volume * 0.45, volume_h2 = volume * 0.55
   - La SOMME des CA produits DOIT correspondre au revenue total par année
   ```

6. **Supprimer le dump JSON brut** (`JSON.stringify(data.framework_data, null, 2)` et `JSON.stringify(data.plan_ovo_data, null, 2)`) qui noie le contexte — remplacer par les blocs structurés ci-dessus

**Fichier** : `src/components/dashboard/EntrepreneurDashboard.tsx`

7. **Enrichir les items produits avec CA/marge** depuis `frameworkData.analyse_marge.activites` :
   - Croiser par nom de produit (fuzzy match) pour attacher `ca`, `marge_pct`, `volume_estime` à chaque produit envoyé
   - Ajouter `prix_moyen` depuis `bmcData.canvas.flux_revenus.prix_moyen`

### Résultat attendu
Le prompt contiendra des contraintes numériques explicites par produit et par année, forçant Claude à remplir les `per_year` avec des volumes et prix réels au lieu de zéros.

