-- Fix: handle_new_user() must run as SECURITY DEFINER so it can insert into
-- public.users regardless of the caller's role/RLS context. Without this,
-- new signups (especially anonymous ones, used for multiplayer) fail with
-- "Database error creating anonymous user" because the INSERT is blocked.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, username, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email, 'Player-' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
