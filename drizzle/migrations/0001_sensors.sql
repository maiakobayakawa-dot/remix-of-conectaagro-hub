CREATE TABLE public.sensors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  plot_id uuid NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
  name text NOT NULL,
  metric text NOT NULL,
  model text NOT NULL DEFAULT '',
  key_hash text NOT NULL UNIQUE,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sensors TO authenticated;
GRANT ALL ON public.sensors TO service_role;
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or shared sensors" ON public.sensors FOR SELECT TO authenticated USING (public.can_view_owner(owner_id));
CREATE POLICY "Insert own sensors" ON public.sensors FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Update own sensors" ON public.sensors FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Delete own sensors" ON public.sensors FOR DELETE TO authenticated USING (owner_id = auth.uid());
REVOKE SELECT (key_hash) ON public.sensors FROM authenticated;

CREATE OR REPLACE FUNCTION public.validate_sensor() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.name := trim(NEW.name); NEW.model := trim(NEW.model);
  IF char_length(NEW.name) NOT BETWEEN 1 AND 80 OR char_length(NEW.model) > 80
     OR NEW.metric NOT IN ('soil_moisture','temperature','air_humidity','radiation','rain')
     OR NEW.key_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid sensor' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.plots WHERE id = NEW.plot_id AND owner_id = NEW.owner_id) THEN
    RAISE EXCEPTION 'Plot not owned' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_sensor BEFORE INSERT OR UPDATE ON public.sensors FOR EACH ROW EXECUTE FUNCTION public.validate_sensor();

CREATE TABLE public.sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id uuid NOT NULL REFERENCES public.sensors(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  value numeric NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sensor_readings_sensor_time ON public.sensor_readings(sensor_id, recorded_at DESC);
GRANT SELECT, INSERT, DELETE ON public.sensor_readings TO authenticated;
GRANT ALL ON public.sensor_readings TO service_role;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or shared readings" ON public.sensor_readings FOR SELECT TO authenticated USING (public.can_view_owner(owner_id));
CREATE POLICY "Insert own readings" ON public.sensor_readings FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Delete own readings" ON public.sensor_readings FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.validate_sensor_reading() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _metric text;
BEGIN
  SELECT metric INTO _metric FROM public.sensors WHERE id = NEW.sensor_id AND owner_id = NEW.owner_id;
  IF _metric IS NULL THEN RAISE EXCEPTION 'Sensor not owned' USING ERRCODE = '42501'; END IF;
  IF NEW.source NOT IN ('manual','device') OR NEW.recorded_at > now() + interval '10 minutes'
     OR (_metric IN ('soil_moisture','air_humidity') AND NEW.value NOT BETWEEN 0 AND 100)
     OR (_metric = 'temperature' AND NEW.value NOT BETWEEN -40 AND 70)
     OR (_metric = 'radiation' AND NEW.value NOT BETWEEN 0 AND 2000)
     OR (_metric = 'rain' AND NEW.value NOT BETWEEN 0 AND 500) THEN
    RAISE EXCEPTION 'Invalid reading' USING ERRCODE = '22023';
  END IF;
  UPDATE public.sensors SET last_seen_at = greatest(coalesce(last_seen_at, NEW.recorded_at), NEW.recorded_at) WHERE id = NEW.sensor_id;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_sensor_reading BEFORE INSERT ON public.sensor_readings FOR EACH ROW EXECUTE FUNCTION public.validate_sensor_reading();