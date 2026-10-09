CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  farm_name text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  main_crops text NOT NULL DEFAULT '',
  producer_type text NOT NULL DEFAULT 'individual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.plot_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  viewer_id uuid NOT NULL,
  viewer_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, viewer_id),
  CHECK (owner_id <> viewer_id)
);
GRANT SELECT, DELETE ON public.plot_shares TO authenticated;
GRANT ALL ON public.plot_shares TO service_role;
ALTER TABLE public.plot_shares ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  code text NOT NULL CHECK (char_length(code) <= 20),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  crop text NOT NULL CHECK (char_length(crop) <= 60),
  stage text NOT NULL DEFAULT '' CHECK (char_length(stage) <= 80),
  area numeric NOT NULL CHECK (area > 0 AND area < 1000000),
  kc numeric NOT NULL DEFAULT 1,
  ndvi numeric NOT NULL DEFAULT 0.7,
  health text NOT NULL DEFAULT 'ótimo' CHECK (health IN ('ótimo','atenção','crítico')),
  moisture numeric NOT NULL DEFAULT 28,
  lat double precision,
  lng double precision,
  boundary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plots TO authenticated;
GRANT ALL ON public.plots TO service_role;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.share_attempts (owner_id uuid NOT NULL, attempted_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.share_attempts TO service_role;
ALTER TABLE public.share_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS share_attempts_owner_time ON public.share_attempts(owner_id, attempted_at);

CREATE OR REPLACE FUNCTION public.can_view_owner(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner = auth.uid() OR EXISTS (
    SELECT 1 FROM public.plot_shares WHERE owner_id = _owner AND viewer_id = auth.uid()
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_owner(uuid) TO authenticated;

DROP POLICY IF EXISTS "View own profile only" ON public.profiles;
CREATE POLICY "View own profile only" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "View own or shared plots" ON public.plots;
CREATE POLICY "View own or shared plots" ON public.plots FOR SELECT TO authenticated USING (public.can_view_owner(owner_id));
DROP POLICY IF EXISTS "Insert own plots" ON public.plots;
CREATE POLICY "Insert own plots" ON public.plots FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Update own plots" ON public.plots;
CREATE POLICY "Update own plots" ON public.plots FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Delete own plots" ON public.plots;
CREATE POLICY "Delete own plots" ON public.plots FOR DELETE TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owner sees their grants" ON public.plot_shares;
CREATE POLICY "Owner sees their grants" ON public.plot_shares FOR SELECT TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "Owner or viewer removes share" ON public.plot_shares;
CREATE POLICY "Owner or viewer removes share" ON public.plot_shares FOR DELETE TO authenticated USING (owner_id = auth.uid() OR viewer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.share_plots_with(_email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _viewer uuid; _clean text := lower(trim(_email)); _owner uuid := auth.uid();
BEGIN
  IF _owner IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_owner::text, 0));
  IF (SELECT count(*) FROM public.share_attempts WHERE owner_id = _owner AND attempted_at > now() - interval '1 hour') >= 20 THEN RAISE EXCEPTION 'try later'; END IF;
  INSERT INTO public.share_attempts(owner_id) VALUES (_owner);
  IF _clean IS NULL OR char_length(_clean) > 255 THEN RETURN true; END IF;
  SELECT id INTO _viewer FROM auth.users WHERE lower(email) = _clean AND email_confirmed_at IS NOT NULL;
  IF _viewer IS NULL OR _viewer = _owner THEN RETURN true; END IF;
  INSERT INTO public.plot_shares (owner_id, viewer_id, viewer_email)
  VALUES (_owner, _viewer, _clean) ON CONFLICT (owner_id, viewer_id) DO NOTHING;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.share_plots_with(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_plots_with(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_producer_profile()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 NEW.full_name := trim(NEW.full_name); NEW.farm_name := trim(NEW.farm_name); NEW.city := trim(NEW.city);
 NEW.phone := trim(NEW.phone); NEW.address := trim(NEW.address); NEW.state := upper(trim(NEW.state));
 NEW.postal_code := trim(NEW.postal_code); NEW.main_crops := trim(NEW.main_crops);
 IF char_length(NEW.full_name) > 120 OR char_length(NEW.farm_name) > 120 OR char_length(NEW.city) > 120
 OR char_length(NEW.phone) > 25 OR char_length(NEW.address) > 240 OR char_length(NEW.main_crops) > 240
 OR NEW.phone !~ '^[0-9+() .-]*$' OR NEW.state !~ '^([A-Z]{2})?$'
 OR NEW.postal_code !~ '^([0-9]{5}-?[0-9]{3})?$'
 OR NEW.producer_type NOT IN ('individual','family','business','cooperative') THEN
 RAISE EXCEPTION 'Invalid producer profile' USING ERRCODE = '22023';
 END IF;
 NEW.updated_at := now();
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_producer_profile ON public.profiles;
CREATE TRIGGER validate_producer_profile BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_producer_profile();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.profiles (id, full_name, farm_name, city, phone, address, state, postal_code, main_crops, producer_type)
 VALUES (NEW.id,
 coalesce(NEW.raw_user_meta_data->>'full_name',''), coalesce(NEW.raw_user_meta_data->>'farm_name',''),
 coalesce(NEW.raw_user_meta_data->>'city',''), coalesce(NEW.raw_user_meta_data->>'phone',''),
 coalesce(NEW.raw_user_meta_data->>'address',''), coalesce(NEW.raw_user_meta_data->>'state',''),
 coalesce(NEW.raw_user_meta_data->>'postal_code',''), coalesce(NEW.raw_user_meta_data->>'main_crops',''),
 coalesce(NEW.raw_user_meta_data->>'producer_type','individual'));
 RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();