-- Acceso de soporte explícito y registrado.
--
-- El personal de Sevra podía leer todo el workspace de un cliente porque las
-- políticas de lectura de incidents/incident_assets/social_mentions son
-- USING (true), pero lo hacía con cuentas sin rol: invisible para el cliente y
-- sin dejar rastro. Ahora tienen el rol 'soporte' (visible en Admin -> Team &
-- roles) y su entrada al workspace queda registrada donde el cliente la ve.

CREATE TABLE public.support_access_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_access_log_accessed_at
  ON public.support_access_log (accessed_at DESC);

ALTER TABLE public.support_access_log ENABLE ROW LEVEL SECURITY;

-- El cliente debe poder verlo: la transparencia es justamente el objetivo.
CREATE POLICY "Authenticated can view support access" ON public.support_access_log
  FOR SELECT TO authenticated USING (true);

-- Sin políticas de INSERT/UPDATE/DELETE. Solo escribe el RPC SECURITY DEFINER
-- de abajo, y nadie -- tampoco el propio soporte -- puede editar ni borrar una
-- entrada para tapar un acceso.

-- Registra la entrada al workspace de un usuario de soporte.
--
-- No hace nada si quien llama no tiene rol 'soporte', de modo que el frontend
-- puede invocarlo siempre sin averiguar antes el rol. Como mucho una fila por
-- usuario y hora, para que una sesión larga no genere cientos de filas.
CREATE OR REPLACE FUNCTION public.log_support_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid() AND role = 'soporte'
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.support_access_log
     WHERE user_id = auth.uid()
       AND accessed_at > now() - interval '1 hour'
  ) THEN
    RETURN;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.support_access_log (user_id, user_email)
  VALUES (auth.uid(), v_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_support_access() TO authenticated;

-- Personal de Sevra con acceso a este despliegue.
-- team_members los hace visibles al admin del cliente en Admin -> Team & roles,
-- y permite el registro (el workspace es solo por invitación).
INSERT INTO public.team_members (email, full_name, role)
VALUES
  ('gavargas@sevra.com', 'Soporte Sevra', 'soporte'),
  ('roayca@gmail.com',   'Soporte Sevra', 'soporte')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'soporte'
  FROM auth.users u
 WHERE u.email IN ('gavargas@sevra.com', 'roayca@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.team_members tm
   SET user_id = u.id
  FROM auth.users u
 WHERE lower(u.email) = lower(tm.email)
   AND tm.user_id IS NULL;
