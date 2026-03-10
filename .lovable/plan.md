

## Plan : Refactorer generate-odd pour utiliser callAI

### Problème
`generate-odd` appelle directement l'API Anthropic au lieu d'utiliser la fonction partagée `callAI` de `helpers.ts`. Toutes les autres edge functions utilisent `callAI`.

### Modification
**Fichier** : `supabase/functions/generate-odd/index.ts`

Remplacer l'appel direct à l'API Anthropic (lignes 126-164) par un appel à `callAI` :

```typescript
// Avant (inline Anthropic call)
const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
const aiResponse = await fetch("https://api.anthropic.com/v1/messages", { ... });
// ... parsing manuel

// Après
const rawData = await callAI(SYSTEM_PROMPT, userPrompt);
const data = normalizeOdd(rawData);
```

- Ajouter `callAI` à l'import depuis `helpers.ts`
- Supprimer tout le code d'appel Anthropic inline et le parsing manuel
- Le reste (Excel, saveDeliverable) reste inchangé

