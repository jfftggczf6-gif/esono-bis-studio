

## Correction de l'export Excel ODD (.xlsm)

### Problèmes identifiés

1. **Template nommé `.xlsx` au lieu de `.xlsm`** : Le code dans `odd-excel-template.ts` et `generate-odd/index.ts` référence `ODD_template.xlsx`, mais le fichier réel dans le bucket `templates` est au format `.xlsm` (macro-enabled). JSZip échoue silencieusement ou le fichier résultant perd ses macros.

2. **Pas de handler ODD dans `download-deliverable`** : Quand l'utilisateur clique "XLSX" pour l'ODD, le code tombe dans le fallback générique (ligne 1130) qui produit un tableur plat inutile au lieu de servir le fichier pré-généré depuis `ovo-outputs`.

3. **Content-Type incorrect** : Le fichier uploadé utilise le MIME type `.xlsx` au lieu de `.xlsm` (`application/vnd.ms-excel.sheet.macroEnabled.12`).

### Corrections

**1. `supabase/functions/_shared/odd-excel-template.ts`**
- Changer `"ODD_template.xlsx"` → `"ODD_template.xlsm"` dans le `download()` du bucket templates

**2. `supabase/functions/generate-odd/index.ts`**
- Changer l'extension du fichier uploadé de `.xlsx` → `.xlsm`
- Changer le contentType en `application/vnd.ms-excel.sheet.macroEnabled.12`
- Mettre à jour la référence template dans les metadata

**3. `supabase/functions/download-deliverable/index.ts`**
- Ajouter un handler pour `odd_analysis` dans la section XLSX (avant le fallback, ligne ~1090) :
  - Requêter le deliverable `odd_excel` pour récupérer le `file_name`
  - Télécharger le fichier depuis le bucket `ovo-outputs`
  - Le servir avec le bon Content-Type `.xlsm`
  - Fallback : générer à la volée via `fillOddExcelTemplate`

### Fichiers modifiés
- `supabase/functions/_shared/odd-excel-template.ts` — nom du template
- `supabase/functions/generate-odd/index.ts` — extension + MIME type
- `supabase/functions/download-deliverable/index.ts` — handler ODD Excel

