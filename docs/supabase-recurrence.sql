-- office-calendar 循環活動欄位
-- 可直接在 Supabase SQL Editor 執行；不會修改既有 RLS 或權限政策。

alter table public.calendar_events
  add column if not exists recurrence_type text default 'none',
  add column if not exists recurrence_interval integer default 1,
  add column if not exists recurrence_end_date date;

update public.calendar_events
set
  recurrence_type = coalesce(recurrence_type, 'none'),
  recurrence_interval = coalesce(recurrence_interval, 1)
where recurrence_type is null
   or recurrence_interval is null;

alter table public.calendar_events
  alter column recurrence_type set default 'none',
  alter column recurrence_type set not null,
  alter column recurrence_interval set default 1,
  alter column recurrence_interval set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'calendar_events_recurrence_type_check'
      and conrelid = 'public.calendar_events'::regclass
  ) then
    alter table public.calendar_events
      add constraint calendar_events_recurrence_type_check
      check (recurrence_type in ('none', 'weekly', 'monthly', 'yearly'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'calendar_events_recurrence_interval_check'
      and conrelid = 'public.calendar_events'::regclass
  ) then
    alter table public.calendar_events
      add constraint calendar_events_recurrence_interval_check
      check (
        (recurrence_type = 'none' and recurrence_interval = 1)
        or (recurrence_type = 'weekly' and recurrence_interval between 1 and 4)
        or (recurrence_type = 'monthly' and recurrence_interval between 1 and 3)
        or (recurrence_type = 'yearly' and recurrence_interval between 1 and 2)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'calendar_events_recurrence_end_date_check'
      and conrelid = 'public.calendar_events'::regclass
  ) then
    alter table public.calendar_events
      add constraint calendar_events_recurrence_end_date_check
      check (recurrence_end_date is null or recurrence_end_date >= event_date);
  end if;
end
$$;
