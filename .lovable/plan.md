

## Audit complet - Problemes identifies

Apres analyse exhaustive de toutes les pages, Edge Functions et composants, voici les problemes restants :

---

### 1. CRASH `data.products.length` dans `generate-ovo-plan` (CRITIQUE)

**Fichier** : `supabase/functions/generate-ovo-plan/index.ts`, lignes 346-347

```js
1. Exactement ${Math.min(data.products.length, 20)} produits...
2. Exactement ${Math.min(data.services.length, 10)} services...
```

Malgre la validation ajoutee dans `EntrepreneurDashboard.tsx` (cote client), la Edge Function elle-meme n'a aucun guard. Si `data.products` ou `data.services` sont `undefined` (appel direct, test, ou autre client comme CoachDashboard), ca crashe avec `Cannot read property 'length' of undefined`.

**Fix** : Ajouter `const products = data.products || []; const services = data.services || [];` au debut du handler et utiliser ces variables partout.

---

### 2. Pas d'authentification dans `generate-ovo-plan` (SECURITE)

Contrairement aux 7 autres Edge Functions qui utilisent `verifyAndGetContext()` de `helpers.ts`, `generate-ovo-plan` ne verifie pas du tout le JWT. N'importe qui peut appeler cette fonction avec un payload arbitraire et consommer des credits Claude API.

**Fix** : Ajouter une verification du token Bearer au debut du handler (extraire le user via `anonClient.auth.getUser()`).

---

### 3. `helpers.ts` `callAI` : `max_tokens: 8192` trop bas pour certains modules

Dans `_shared/helpers.ts` ligne 225, `max_tokens` est a `8192`. Les modules comme `generate-inputs` et `generate-framework` demandent des JSON tres volumineux (170+ lignes de schema). Risque de troncature identique au bug OVO.

**Fix** : Augmenter a `12288` dans `helpers.ts` pour tous les modules utilisant `callAI`.

---

### 4. `helpers.ts` `verifyAndGetContext` : double `req.json()` (BUG POTENTIEL)

Ligne 158 de `helpers.ts` : `const { enterprise_id } = await req.json();`. Le body d'une Request ne peut etre lu qu'une seule fois. Si une Edge Function lit `req.json()` avant d'appeler `verifyAndGetContext`, la deuxieme lecture echouera. Actuellement ca marche parce que les fonctions appellent `verifyAndGetContext` en premier, mais c'est fragile.

**Fix** : Pas de changement immediat necessaire, mais a noter.

---

### 5. `EntrepreneurDashboard.tsx` : Route `/formations` inexistante

Ligne 445 : `onClick={() => navigate('/formations')}` - cette route n'existe pas dans `App.tsx`. Le bouton "Formations" mene vers une page 404.

**Fix** : Soit supprimer le bouton, soit le cacher, soit ajouter la route.

---

### 6. `CoachDashboard` ne peut pas generer le Plan OVO Excel

Le `CoachDashboard` utilise la pipeline standard (`generate-plan-ovo`) qui sauvegarde en `deliverables` avec le type `plan_ovo`, mais la generation Excel OVO (`generate-ovo-plan`) n'est jamais appelee depuis le coach dashboard. Le coach n'a aucun moyen de generer/telecharger le fichier Excel OVO pour ses entrepreneurs.

**Fix** : Ajouter un bouton de generation OVO Excel dans le `CoachDashboard` similaire a celui de l'`EntrepreneurDashboard`.

---

### 7. `globalScore` division par zero potentielle

`EntrepreneurDashboard.tsx` ligne 257 :
```js
deliverables.filter((d: any) => d.score).length || 0
```
Si tous les deliverables ont `score = 0` (falsy), le filtre retourne un tableau vide, `.length` = 0, et `|| 0` donne 0. Division `sum / 0` = `NaN`, puis `Math.round(NaN)` = `NaN`.

**Fix** : Changer en `deliverables.filter((d: any) => d.score != null).length || 1`.

---

### 8. Pipeline Diagnostic en premier dans `EntrepreneurDashboard` mais dernier dans `CoachDashboard`

L'ordre des pipelines differe entre les deux dashboards :
- **Entrepreneur** : Diagnostic -> BMC -> SIC -> Inputs -> Framework -> Plan OVO -> BP -> ODD
- **Coach** : BMC -> SIC -> Inputs -> Framework -> Diagnostic -> Plan OVO -> BP -> ODD

Le Diagnostic depend des donnees BMC, SIC, Inputs et Framework. Dans le pipeline Entrepreneur, il est genere en premier sans ces donnees, produisant un diagnostic pauvre.

**Fix** : Aligner l'ordre du pipeline Entrepreneur avec celui du Coach (Diagnostic apres Framework).

---

## Plan de corrections

**Fichier `supabase/functions/generate-ovo-plan/index.ts`** :
1. Ajouter validation `products`/`services` au debut du handler (lignes 115-118)
2. Ajouter verification JWT (extraire user du token Bearer)

**Fichier `supabase/functions/_shared/helpers.ts`** :
3. Augmenter `max_tokens` de 8192 a 12288

**Fichier `src/components/dashboard/EntrepreneurDashboard.tsx`** :
4. Corriger le calcul `globalScore` (division par zero)
5. Reordonner le pipeline (Diagnostic apres Framework)
6. Supprimer ou masquer le bouton "Formations"

**Redeploiement** : `generate-ovo-plan`

