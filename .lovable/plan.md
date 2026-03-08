

## Probleme

Le fichier ODD Excel `.xlsm` reste corrompu malgré le fix VBA précédent. Deux causes probables :

1. **L'option globale `compression: "DEFLATE"` dans `generateAsync` écrase le `STORE` per-file** sur `vbaProject.bin` — JSZip ne garantit pas la priorité du per-file quand un global est spécifié.
2. **D'autres fichiers binaires sensibles** dans le `.xlsm` (images, `[Content_Types].xml` mal formé, etc.) peuvent aussi être corrompus par la re-compression.

## Solution

Modifier `supabase/functions/_shared/odd-excel-template.ts` :

1. **Ne pas passer de compression globale** dans `generateAsync`. Au lieu de ça, après toutes les modifications, itérer sur tous les fichiers du ZIP et forcer la compression appropriée :
   - `STORE` pour `vbaProject.bin` et tout fichier dans `xl/vba*`
   - `DEFLATE` pour les fichiers XML/rels

2. **Préserver TOUS les fichiers binaires** (pas seulement `vbaProject.bin`) en les extrayant avant modification et les ré-injectant avec `STORE`.

```typescript
// Before generating, preserve all VBA-related binaries
const vbaFiles: Array<{path: string, bytes: Uint8Array}> = [];
zip.forEach((relativePath, file) => {
  if (relativePath.includes("vbaProject") || relativePath.startsWith("xl/vba")) {
    // Will be re-read below
  }
});

// Extract VBA binaries
const vbaFile = zip.file("xl/vbaProject.bin");
const vbaBytes = vbaFile ? await vbaFile.async("uint8array") : null;

// ... sheet modifications ...

// Re-inject ALL VBA files with STORE
if (vbaBytes) {
  zip.file("xl/vbaProject.bin", vbaBytes, { compression: "STORE" });
}

// Generate WITHOUT global compression override
return await zip.generateAsync({ 
  type: "uint8array",
  // No global compression — let per-file settings take effect
});
```

3. **Aussi redéployer** la edge function `generate-odd`.

### Fichier modifié
- `supabase/functions/_shared/odd-excel-template.ts` — ligne 287 : retirer `compression: "DEFLATE"` de `generateAsync`, et s'assurer que les fichiers non-VBA sont compressés individuellement lors de leur écriture.

