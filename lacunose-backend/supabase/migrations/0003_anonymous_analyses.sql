-- 0003_anonymous_analyses.sql
-- Adds support for unauthenticated onboarding-time analyses that get claimed
-- by the user after they sign up. Idempotent.

-- 1. Allow null user_id on gap_analyses.
alter table gap_analyses alter column user_id drop not null;

-- 2. Per-anonymous-analysis claim token (opaque, random). Mobile client keeps
--    this in AsyncStorage and calls /v1/analyses/:id/claim after signup.
alter table gap_analyses
  add column if not exists anonymous_claim_token text,
  add column if not exists anonymous_device_id text,
  add column if not exists anonymous_ip text;

-- 3. Flag + TTL: anonymous rows are pruned after 7 days if never claimed.
alter table gap_analyses
  add column if not exists is_anonymous boolean default false,
  add column if not exists claim_expires_at timestamptz;

-- 4. Index on token for O(1) claim lookup.
create index if not exists gap_analyses_claim_token_idx
  on gap_analyses (anonymous_claim_token)
  where anonymous_claim_token is not null;

-- 5. Index on (device_id, created_at) for rate-limiting (1 anon analysis / device / 24h).
create index if not exists gap_analyses_anon_device_idx
  on gap_analyses (anonymous_device_id, created_at desc)
  where is_anonymous = true;

-- 6. RLS: anonymous rows are NEVER selectable by any auth user; they're only
--    served back to the creator via the edge-fn (which reads with service role).
--    Existing `own_analyses` policy already filters on user_id = auth.uid(),
--    which naturally excludes null user_id rows. No policy change needed.

-- 7. Helper to transfer ownership atomically during claim.
create or replace function claim_anonymous_analysis(
  p_analysis_id uuid,
  p_claim_token text,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_updated int;
begin
  update gap_analyses
     set user_id = p_user_id,
         is_anonymous = false,
         anonymous_claim_token = null,
         claim_expires_at = null
   where id = p_analysis_id
     and anonymous_claim_token = p_claim_token
     and is_anonymous = true
     and claim_expires_at > now();
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;
grant execute on function claim_anonymous_analysis(uuid, text, uuid) to authenticated, anon, service_role;

-- 8. Cleanup: also transfer any gap_items already produced for the analysis
--    (RLS on gap_items only filters via `analysis_id` -> gap_analyses.user_id,
--     so this happens automatically once gap_analyses.user_id is updated).
