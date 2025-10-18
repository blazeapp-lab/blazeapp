-- Security definer function to check if viewer is blocked by owner
create or replace function public.is_blocked(viewer_id uuid, owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where blocker_id = owner_id and blocked_id = viewer_id
  );
$$;

-- Ensure only authenticated users can execute
revoke all on function public.is_blocked(uuid, uuid) from public;
grant execute on function public.is_blocked(uuid, uuid) to authenticated;