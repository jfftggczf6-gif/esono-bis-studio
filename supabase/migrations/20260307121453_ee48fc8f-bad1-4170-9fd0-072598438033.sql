
-- 1. Table coach_uploads : documents uploadés par le coach
CREATE TABLE IF NOT EXISTS public.coach_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches see own uploads"
  ON public.coach_uploads FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches insert own uploads"
  ON public.coach_uploads FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches delete own uploads"
  ON public.coach_uploads FOR DELETE
  USING (auth.uid() = coach_id);

-- 2. Colonnes visibilité sur deliverables
ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS generated_by TEXT DEFAULT 'entrepreneur',
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'shared',
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coach_id UUID;

-- 3. Colonnes supplémentaires sur enterprises
ALTER TABLE public.enterprises
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'identite',
  ADD COLUMN IF NOT EXISTS score_ir INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT now();

-- 4. Mettre à jour la RLS deliverables pour gérer la visibilité
DROP POLICY IF EXISTS "Users see deliverables of own enterprises" ON public.deliverables;

CREATE POLICY "Users see deliverables of own enterprises"
  ON public.deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enterprises e
      WHERE e.id = enterprise_id
      AND (
        e.coach_id = auth.uid()
        OR
        (e.user_id = auth.uid() AND (generated_by = 'entrepreneur' OR generated_by = 'coach_mirror' OR visibility = 'shared'))
      )
    )
  );

-- 5. Index pour performance
CREATE INDEX IF NOT EXISTS idx_coach_uploads_enterprise ON public.coach_uploads(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_coach_uploads_coach ON public.coach_uploads(coach_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_visibility ON public.deliverables(visibility);
CREATE INDEX IF NOT EXISTS idx_enterprises_coach ON public.enterprises(coach_id);
