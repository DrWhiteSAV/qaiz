-- Fix handle_new_user trigger to generate referral_code for Google sign-ups
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ref_code TEXT;
BEGIN
  ref_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.profiles (uid, email, display_name, avatar_url, balance, role, level, referral_code, referral_count, referral_earnings, author_earnings, author_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Игрок'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    100,
    'player',
    1,
    ref_code,
    0,
    0,
    0,
    'none'
  )
  ON CONFLICT (uid) DO UPDATE SET
    referral_code = CASE 
      WHEN profiles.referral_code IS NULL OR profiles.referral_code = '' 
      THEN ref_code 
      ELSE profiles.referral_code 
    END;
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$$;

-- Backfill referral_code for existing profiles that lack it
UPDATE public.profiles
SET referral_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6))
WHERE referral_code IS NULL OR referral_code = '';