


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."acquire_board_lock"("board_id" integer, "client_id" "text", "ttl_seconds" integer DEFAULT 300) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$DECLARE
  time_now timestamptz := now();
  --time_expires = Current time + a number of seconds 
  --The ::interval part converts it into a time stamps i.e. 1:00:00
  time_expires timestamptz := time_now + (ttl_seconds || ' seconds')::interval;
BEGIN

IF NOT pg_try_advisory_xact_lock(hashtext('board:' || board_id::text)) THEN
  RETURN false;
END IF;

  INSERT into exclusive_resource_locks(resource_type, resource_id, locked_by, expires_at)
  VALUES ('board', board_id, client_id, time_expires)

  --This deals with the conflict if someone else already has the lock 
  --"SET" is referring to the columns and their new values
  --Essentially, if there is a conflict we see how to address 
  --that conflict depending on conditions such as the time in this case
  on CONFLICT (resource_type, resource_id) do UPDATE SET
      locked_by = client_id,
      expires_at = time_expires,
      updated_at = time_now
    --This WHERE clause executes first - if the lock is expired, then this returns true and the update is triggered. If the lock is not expired then the entire update is skipped and nothing is modified
    where exclusive_resource_locks.expires_at < time_now;

  --Return true if we got the lock by looking in the resource_locks
  --table to see if our client_id has the lock 
  return exists(
    select 1 from exclusive_resource_locks
    where resource_type = 'board'
      and resource_id = board_id
      and locked_by = client_id
      and expires_at > time_now
  );

end;$$;


ALTER FUNCTION "public"."acquire_board_lock"("board_id" integer, "client_id" "text", "ttl_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."acquire_project_drag_lock"("p_project_id" integer) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  lock_key bigint;
  got_lock boolean;
BEGIN
  -- Use a consistent lock key based on project_id
  lock_key := hashtext('project_drag_lock:' || p_project_id::text);
  
  -- Try to acquire advisory lock
  SELECT pg_try_advisory_xact_lock(lock_key) INTO got_lock;
  
  RETURN got_lock;
END;
$$;


ALTER FUNCTION "public"."acquire_project_drag_lock"("p_project_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."acquire_project_edit_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer DEFAULT 300) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$declare
  time_now timestamptz := now();
  time_expires timestamptz := time_now + (ttl_seconds || ' seconds')::interval;
begin

IF NOT pg_try_advisory_xact_lock(
    hashtext('project_edit:' || project_id::text)
) THEN
    RETURN false;
END IF;

  insert into exclusive_resource_locks(resource_type, resource_id, locked_by, expires_at)
  values ('project_edit', project_id, client_id, time_expires)
  on conflict (resource_type, resource_id) do update set
      locked_by = client_id,
      expires_at = time_expires,
      updated_at = time_now
    where exclusive_resource_locks.expires_at < time_now;

  return exists(
    select 1 from exclusive_resource_locks
    where resource_type = 'project_edit'
      and resource_id = project_id
      and locked_by = client_id
      and expires_at > time_now
  );
end;$$;


ALTER FUNCTION "public"."acquire_project_edit_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."acquire_project_session_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer DEFAULT 2700) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$declare
  time_now timestamptz := now();
  time_expires timestamptz := time_now + (ttl_seconds || ' seconds')::interval;
begin

IF NOT pg_try_advisory_xact_lock_shared(
    hashtext('project_session:' || project_id::text)
) THEN
    RETURN false;
END IF;

  insert into not_exclusive_resource_locks(resource_type, resource_id, locked_by, expires_at)
  values ('project_session', project_id, client_id, time_expires)
  --If there is a conflict (where you are already in the project_session
  --just update the expired at and start time 
  on conflict (resource_type, resource_id, locked_by) do update set
      expires_at = time_expires,
      updated_at = time_now;

  return true;
end;$$;


ALTER FUNCTION "public"."acquire_project_session_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_board"("p_project_id" integer, "p_title" "text", "p_description" "text" DEFAULT NULL::"text", "p_duration" numeric DEFAULT NULL::numeric, "p_transition" "text" DEFAULT NULL::"text", "p_aspect_ratio" "text" DEFAULT NULL::"text", "p_camera_angle" "text" DEFAULT NULL::"text", "p_camera_movement" "text" DEFAULT NULL::"text", "p_lens_focal_mm" numeric DEFAULT NULL::numeric, "p_image_url" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    next_shot integer;
BEGIN
    -- Get the next shot number
    SELECT COALESCE(MAX(shot), 0) + 1
    INTO next_shot
    FROM boards
    WHERE project_id = p_project_id;

    -- Insert the new board with all fields including image_url
    INSERT INTO boards(
        project_id, 
        title, 
        description, 
        shot, 
        duration, 
        transition, 
        aspect_ratio, 
        camera_angle, 
        camera_movement, 
        lens_focal_mm,
        image_url  -- ADD THIS FIELD
    )
    VALUES (
        p_project_id, 
        p_title, 
        p_description, 
        next_shot, 
        p_duration, 
        p_transition, 
        p_aspect_ratio, 
        p_camera_angle, 
        p_camera_movement, 
        p_lens_focal_mm, 
        p_image_url
    );
END;
$$;


ALTER FUNCTION "public"."add_board"("p_project_id" integer, "p_title" "text", "p_description" "text", "p_duration" numeric, "p_transition" "text", "p_aspect_ratio" "text", "p_camera_angle" "text", "p_camera_movement" "text", "p_lens_focal_mm" numeric, "p_image_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_project_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  target_project_id INT;
BEGIN
  -- Determine project_id depending on operation
  IF TG_OP = 'DELETE' THEN
    target_project_id := OLD.project_id;
  ELSE
    target_project_id := NEW.project_id;
  END IF;

  UPDATE projects
  SET updated_at = now()
  WHERE id = target_project_id;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."bump_project_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_project_session_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer DEFAULT 2700) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$declare
  time_now timestamptz := now();
  time_expires timestamptz := time_now + (ttl_seconds || ' seconds')::interval;
begin

IF NOT pg_try_advisory_xact_lock_shared(
    hashtext('project_session:' || project_id::text)
) THEN
    RETURN false;
END IF;


  update not_exclusive_resource_locks
  set expires_at = time_expires,
      updated_at = time_now
  where resource_type = 'project_session'
    and resource_id = project_id
    and locked_by = client_id;

  return found;
end;$$;


ALTER FUNCTION "public"."refresh_project_session_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_board_lock"("board_id" integer, "client_id" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$begin
  delete FROM exclusive_resource_locks
  WHERE resource_type = 'board'
    AND resource_id = board_id
    AND locked_by = client_id;

  --Returns true if any rows were deleted, false if no rows were found to delete
  return FOUND;
end;$$;


ALTER FUNCTION "public"."release_board_lock"("board_id" integer, "client_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_project_drag_lock"("p_project_id" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Advisory locks are automatically released at transaction end
  -- This function is just for consistency
  PERFORM 1; -- No-op
END;
$$;


ALTER FUNCTION "public"."release_project_drag_lock"("p_project_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_project_edit_lock"("project_id" integer, "client_id" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$begin
  delete from exclusive_resource_locks
  where resource_type = 'project_edit'
    and resource_id = project_id
    and locked_by = client_id;

  return found;
end;$$;


ALTER FUNCTION "public"."release_project_edit_lock"("project_id" integer, "client_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_project_session_lock"("project_id" integer, "client_id" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$begin
  delete from not_exclusive_resource_locks
  where resource_type = 'project_session'
    and resource_id = project_id
    and locked_by = client_id;

  return found;
end;$$;


ALTER FUNCTION "public"."release_project_session_lock"("project_id" integer, "client_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_delete_board"("board_id" integer, "client_id" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$declare
  time_now timestamptz := now();
begin

IF NOT pg_try_advisory_xact_lock(hashtext('board:' || board_id::text)) THEN
  raise exception 'Board cannot be deleted: it is currently being edited (race condition test).';
END IF;

  if exists (
    select 1 from exclusive_resource_locks
    where resource_type = 'board'
      and resource_id = board_id
      and locked_by <> client_id
      and expires_at > time_now
  ) then
  --kicks out of function if the condition is raised
    raise exception 'Board cannot be deleted: it is currently being edited.';
  --ends conditional block
  end if;

  --delete from lock table and boards table
  delete from exclusive_resource_locks where resource_type = 'board' and resource_id = board_id; 
  delete from boards where id = board_id;
end;$$;


ALTER FUNCTION "public"."safe_delete_board"("board_id" integer, "client_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_delete_project"("target_project_id" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  time_now timestamptz := now();
  active_session_count integer;
  active_edit_lock boolean;
  project_exists boolean;
BEGIN

IF NOT pg_try_advisory_xact_lock(
    hashtext('project_edit:' || target_project_id::text)
) THEN
    RAISE EXCEPTION 'Project cannot be deleted: someone is currently editing this project (race condition check).'; 
END IF;


IF NOT pg_try_advisory_xact_lock(
    hashtext('project_session:' || target_project_id::text)
) THEN
    RAISE EXCEPTION 'Project cannot be deleted: someone is currently working on this project (race condition check).';
END IF;

  -- First verify the project exists
  SELECT EXISTS(
    SELECT 1 FROM projects 
    WHERE id = target_project_id
  ) INTO project_exists;

  IF NOT project_exists THEN
    RAISE EXCEPTION 'Project not found.';
  END IF;

  -- Check if ANY user has an active session in this project
  SELECT count(*) INTO active_session_count
  FROM not_exclusive_resource_locks
  WHERE resource_type = 'project_session'
    AND resource_id = target_project_id
    AND expires_at > time_now;

  -- Check if ANY user has an active edit lock
  SELECT EXISTS(
    SELECT 1 FROM exclusive_resource_locks
    WHERE resource_type = 'project_edit'
      AND resource_id = target_project_id
      AND expires_at > time_now
  ) INTO active_edit_lock;

  IF active_session_count > 0 THEN
    RAISE EXCEPTION 'Project cannot be deleted: % user(s) are currently working in this project.', active_session_count;
  END IF;

  IF active_edit_lock THEN
    RAISE EXCEPTION 'Project cannot be deleted: someone is currently editing this project.';
  END IF;

  -- Delete related records and the project itself
  DELETE FROM boards WHERE project_id = target_project_id;
  DELETE FROM projects WHERE id = target_project_id;
END;$$;


ALTER FUNCTION "public"."safe_delete_project"("target_project_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_project_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_project_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."boards" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "shot" bigint NOT NULL,
    "description" "text",
    "duration" bigint,
    "transition" "text" DEFAULT 'cut'::"text",
    "aspect_ratio" "text",
    "camera_angle" "text",
    "camera_movement" "text",
    "lens_focal_mm" bigint,
    "updated_time" timestamp with time zone DEFAULT "now"(),
    "project_id" bigint NOT NULL,
    "image_url" "text"
);


ALTER TABLE "public"."boards" OWNER TO "postgres";


ALTER TABLE "public"."boards" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."boards_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."exclusive_resource_locks" (
    "resource_type" "text" NOT NULL,
    "resource_id" integer NOT NULL,
    "locked_by" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exclusive_resource_locks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."not_exclusive_resource_locks" (
    "resource_type" "text" NOT NULL,
    "resource_id" integer NOT NULL,
    "locked_by" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."not_exclusive_resource_locks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text"
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


ALTER TABLE "public"."projects" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."projects_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."exclusive_resource_locks"
    ADD CONSTRAINT "board_resource_locks_pkey" PRIMARY KEY ("resource_type", "resource_id");



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."not_exclusive_resource_locks"
    ADD CONSTRAINT "non-exclusive_resource_locks_pkey" PRIMARY KEY ("resource_type", "resource_id", "locked_by");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "boards_update_project_timestamp" AFTER INSERT OR DELETE OR UPDATE ON "public"."boards" FOR EACH ROW EXECUTE FUNCTION "public"."bump_project_updated_at"();



CREATE OR REPLACE TRIGGER "project_touch_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."touch_project_updated_at"();



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."boards";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."exclusive_resource_locks";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."not_exclusive_resource_locks";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."projects";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."acquire_board_lock"("board_id" integer, "client_id" "text", "ttl_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."acquire_board_lock"("board_id" integer, "client_id" "text", "ttl_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."acquire_board_lock"("board_id" integer, "client_id" "text", "ttl_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."acquire_project_drag_lock"("p_project_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."acquire_project_drag_lock"("p_project_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."acquire_project_drag_lock"("p_project_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."acquire_project_edit_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."acquire_project_edit_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."acquire_project_edit_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."acquire_project_session_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."acquire_project_session_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."acquire_project_session_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_board"("p_project_id" integer, "p_title" "text", "p_description" "text", "p_duration" numeric, "p_transition" "text", "p_aspect_ratio" "text", "p_camera_angle" "text", "p_camera_movement" "text", "p_lens_focal_mm" numeric, "p_image_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_board"("p_project_id" integer, "p_title" "text", "p_description" "text", "p_duration" numeric, "p_transition" "text", "p_aspect_ratio" "text", "p_camera_angle" "text", "p_camera_movement" "text", "p_lens_focal_mm" numeric, "p_image_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_board"("p_project_id" integer, "p_title" "text", "p_description" "text", "p_duration" numeric, "p_transition" "text", "p_aspect_ratio" "text", "p_camera_angle" "text", "p_camera_movement" "text", "p_lens_focal_mm" numeric, "p_image_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."bump_project_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."bump_project_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bump_project_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_project_session_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_project_session_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_project_session_lock"("project_id" integer, "client_id" "text", "ttl_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."release_board_lock"("board_id" integer, "client_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."release_board_lock"("board_id" integer, "client_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_board_lock"("board_id" integer, "client_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."release_project_drag_lock"("p_project_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."release_project_drag_lock"("p_project_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_project_drag_lock"("p_project_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."release_project_edit_lock"("project_id" integer, "client_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."release_project_edit_lock"("project_id" integer, "client_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_project_edit_lock"("project_id" integer, "client_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."release_project_session_lock"("project_id" integer, "client_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."release_project_session_lock"("project_id" integer, "client_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_project_session_lock"("project_id" integer, "client_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_delete_board"("board_id" integer, "client_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_delete_board"("board_id" integer, "client_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_delete_board"("board_id" integer, "client_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_delete_project"("target_project_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."safe_delete_project"("target_project_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_delete_project"("target_project_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_project_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_project_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_project_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."boards" TO "anon";
GRANT ALL ON TABLE "public"."boards" TO "authenticated";
GRANT ALL ON TABLE "public"."boards" TO "service_role";



GRANT ALL ON SEQUENCE "public"."boards_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."boards_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."boards_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."exclusive_resource_locks" TO "anon";
GRANT ALL ON TABLE "public"."exclusive_resource_locks" TO "authenticated";
GRANT ALL ON TABLE "public"."exclusive_resource_locks" TO "service_role";



GRANT ALL ON TABLE "public"."not_exclusive_resource_locks" TO "anon";
GRANT ALL ON TABLE "public"."not_exclusive_resource_locks" TO "authenticated";
GRANT ALL ON TABLE "public"."not_exclusive_resource_locks" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































