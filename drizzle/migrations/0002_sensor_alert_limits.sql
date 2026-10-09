ALTER TABLE public.sensors
  ADD COLUMN alert_min numeric,
  ADD COLUMN alert_max numeric,
  ADD COLUMN offline_minutes integer NOT NULL DEFAULT 60,
  ADD CONSTRAINT sensors_alert_range CHECK (alert_min IS NULL OR alert_max IS NULL OR alert_min <= alert_max),
  ADD CONSTRAINT sensors_offline_minutes CHECK (offline_minutes BETWEEN 5 AND 10080);