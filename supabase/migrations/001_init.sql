-- Supabase migration: create core tables and RLS policies for Feature Descriptors
-- File: supabase/migrations/001_init.sql

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: descriptors
CREATE TABLE IF NOT EXISTS public.descriptors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  image_path text,
  image_version integer DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: annotations
CREATE TABLE IF NOT EXISTS public.annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descriptor_id uuid NOT NULL REFERENCES public.descriptors(id) ON DELETE CASCADE,
  type text NOT NULL,
  coords jsonb NOT NULL,
  title text,
  tags text[] DEFAULT '{}',
  estimate_points integer,
  css_selector text,
  xpath text,
  status text DEFAULT 'open',
  owner_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: threads/messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id uuid NOT NULL REFERENCES public.annotations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table: collaborators
CREATE TABLE IF NOT EXISTS public.collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descriptor_id uuid NOT NULL REFERENCES public.descriptors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer', -- viewer | editor | admin
  invited_by uuid,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Trigger: update updated_at timestamp on update
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER descriptors_set_updated_at
BEFORE UPDATE ON public.descriptors
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER annotations_set_updated_at
BEFORE UPDATE ON public.annotations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger function to enforce max 5 descriptors per user
CREATE OR REPLACE FUNCTION public.enforce_descriptor_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  cnt integer;
BEGIN
  -- Only enforce on INSERT (not on updates)
  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO cnt FROM public.descriptors WHERE owner_id = NEW.owner_id;
    IF cnt >= 5 THEN
      RAISE EXCEPTION 'descriptor_limit_exceeded: user % already has % descriptors', NEW.owner_id, cnt;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_descriptor_limit
BEFORE INSERT ON public.descriptors
FOR EACH ROW EXECUTE FUNCTION public.enforce_descriptor_limit();

-- Row Level Security (RLS) policies
ALTER TABLE public.descriptors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Helpers: check if user is collaborator
-- We use EXISTS subqueries in policies directly.

-- Policies for descriptors
-- Allow owners and collaborators to SELECT
CREATE POLICY "select_descriptors_for_owner_or_collaborator" ON public.descriptors
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.collaborators c WHERE c.descriptor_id = public.descriptors.id AND c.user_id = auth.uid())
  );

-- Allow authenticated users to INSERT where they are owner
CREATE POLICY "insert_descriptors_owner" ON public.descriptors
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Allow owners and collaborators with editor/admin to UPDATE
CREATE POLICY "update_descriptors_owner_or_editor" ON public.descriptors
  FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.collaborators c WHERE c.descriptor_id = public.descriptors.id AND c.user_id = auth.uid() AND c.role IN ('editor','admin'))
  )
  WITH CHECK (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.collaborators c WHERE c.descriptor_id = public.descriptors.id AND c.user_id = auth.uid() AND c.role IN ('editor','admin'))
  );

-- Allow owners and admin collaborators to DELETE
CREATE POLICY "delete_descriptors_owner_or_admin" ON public.descriptors
  FOR DELETE
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.collaborators c WHERE c.descriptor_id = public.descriptors.id AND c.user_id = auth.uid() AND c.role = 'admin')
  );

-- Policies for collaborators
-- Allow descriptor owner to manage collaborators
CREATE POLICY "manage_collaborators_by_owner" ON public.collaborators
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.descriptors d WHERE d.id = public.collaborators.descriptor_id AND d.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.descriptors d WHERE d.id = public.collaborators.descriptor_id AND d.owner_id = auth.uid())
  );

-- Allow users to read their own collaborator records (to see accepted invites)
CREATE POLICY "select_own_collaborator_row" ON public.collaborators
  FOR SELECT
  USING (user_id = auth.uid());

-- Policies for annotations
-- Allow select if user can read the parent descriptor
CREATE POLICY "select_annotations_if_can_read_descriptor" ON public.annotations
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.descriptors d WHERE d.id = public.annotations.descriptor_id AND (
      d.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.collaborators c WHERE c.descriptor_id = d.id AND c.user_id = auth.uid())
    ))
  );

-- Allow insert if user can edit parent descriptor (owner or editor/admin collaborator)
CREATE POLICY "insert_annotations_if_can_edit_descriptor" ON public.annotations
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.descriptors d WHERE d.id = NEW.descriptor_id AND (
      d.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.collaborators c WHERE c.descriptor_id = d.id AND c.user_id = auth.uid() AND c.role IN ('editor','admin'))
    ))
  );

-- Allow update/delete if user can edit
CREATE POLICY "update_annotations_if_can_edit" ON public.annotations
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.descriptors d WHERE d.id = public.annotations.descriptor_id AND (
      d.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.collaborators c WHERE c.descriptor_id = d.id AND c.user_id = auth.uid() AND c.role IN ('editor','admin'))
    ))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.descriptors d WHERE d.id = NEW.descriptor_id AND (
      d.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.collaborators c WHERE c.descriptor_id = d.id AND c.user_id = auth.uid() AND c.role IN ('editor','admin'))
    ))
  );

CREATE POLICY "delete_annotations_if_can_edit" ON public.annotations
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.descriptors d WHERE d.id = public.annotations.descriptor_id AND (
      d.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.collaborators c WHERE c.descriptor_id = d.id AND c.user_id = auth.uid() AND c.role IN ('editor','admin'))
    ))
  );

-- Policies for messages (threads)
CREATE POLICY "select_messages_if_can_read_descriptor" ON public.messages
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.annotations a JOIN public.descriptors d ON d.id = a.descriptor_id WHERE a.id = public.messages.annotation_id AND (
      d.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.collaborators c WHERE c.descriptor_id = d.id AND c.user_id = auth.uid())
    ))
  );

CREATE POLICY "insert_messages_if_can_comment" ON public.messages
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.annotations a JOIN public.descriptors d ON d.id = a.descriptor_id WHERE a.id = NEW.annotation_id AND (
      d.owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.collaborators c WHERE c.descriptor_id = d.id AND c.user_id = auth.uid() AND c.role IN ('editor','admin','viewer'))
    ))
  );

CREATE POLICY "delete_own_message" ON public.messages
  FOR DELETE
  USING (author_id = auth.uid());

-- Grant minimal public usage to allow authenticated access via policies
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Note: Supabase's auth.uid() is available inside policies. When calling inserts from the client
-- ensure owner_id is set to auth.uid() (either client-side or via a Postgres function that sets owner automatically).

-- Optional: function to set owner on insert (uses current_setting to read JWT sub if needed)
CREATE OR REPLACE FUNCTION public.set_owner_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_owner_on_descriptors
BEFORE INSERT ON public.descriptors
FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

-- End of migration
