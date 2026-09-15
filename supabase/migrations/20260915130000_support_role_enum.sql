-- Rol de soporte para el personal de Sevra.
--
-- Va en su propia migración a propósito: Postgres no permite USAR un valor de
-- enum recién añadido dentro de la misma transacción que lo añade. La
-- migración siguiente (20260915140000) es la que ya puede asignarlo.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'soporte';
