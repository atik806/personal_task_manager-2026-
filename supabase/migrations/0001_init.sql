-- Daymark — initial schema.
-- Deploy with: supabase db push
--
-- Every table is user-scoped (user_id) with RLS restricted to the owner,
-- a BEFORE INSERT trigger that stamps user_id from auth.uid(), and an
-- updated_at trigger on the mutable tables.

create extension if not exists pgcrypto;

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#4C5FD5',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  project_id uuid references public.projects (id) on delete set null,
  due_date date,
  due_time time,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  position integer not null default 0,
  parent_task_id uuid references public.tasks (id) on delete cascade,
  recurrence_rule text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.task_tags (
  task_id uuid not null references public.tasks (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (task_id, tag_id)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  name text not null,
  file_path text not null,
  file_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

/* ------------------------------------------------------------------ */
/* Triggers                                                            */
/* ------------------------------------------------------------------ */

create or replace function public.set_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end $$;

drop trigger if exists trg_set_user_id_projects on public.projects;
create trigger trg_set_user_id_projects
  before insert on public.projects
  for each row execute function public.set_user_id();

drop trigger if exists trg_set_user_id_tasks on public.tasks;
create trigger trg_set_user_id_tasks
  before insert on public.tasks
  for each row execute function public.set_user_id();

drop trigger if exists trg_set_user_id_tags on public.tags;
create trigger trg_set_user_id_tags
  before insert on public.tags
  for each row execute function public.set_user_id();

drop trigger if exists trg_set_user_id_attachments on public.attachments;
create trigger trg_set_user_id_attachments
  before insert on public.attachments
  for each row execute function public.set_user_id();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_touch_updated_at_projects on public.projects;
create trigger trg_touch_updated_at_projects
  before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_updated_at_tasks on public.tasks;
create trigger trg_touch_updated_at_tasks
  before update on public.tasks
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_updated_at_tags on public.tags;
create trigger trg_touch_updated_at_tags
  before update on public.tags
  for each row execute function public.touch_updated_at();

/* ------------------------------------------------------------------ */
/* Row Level Security                                                  */
/* ------------------------------------------------------------------ */

alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.tags enable row level security;
alter table public.task_tags enable row level security;
alter table public.attachments enable row level security;

create policy "own projects" on public.projects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own tasks" on public.tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own tags" on public.tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own attachments" on public.attachments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- task_tags links are only visible/manageable through the user's own tasks
-- and tags (no public join table).
create policy "own task_tags" on public.task_tags
  for all
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and t.user_id = auth.uid()
    )
    and exists (
      select 1 from public.tags g
      where g.id = tag_id and g.user_id = auth.uid()
    )
  );

/* ------------------------------------------------------------------ */
/* Indexes                                                             */
/* ------------------------------------------------------------------ */

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_due_date_idx on public.tasks (due_date) where status <> 'done';
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists tasks_parent_id_idx on public.tasks (parent_task_id);
create index if not exists tags_user_id_idx on public.tags (user_id);
create index if not exists attachments_task_id_idx on public.attachments (task_id);
