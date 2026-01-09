import { supabase } from './supabaseClient';
import { normalizeEmail } from './normalizeEmail';

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function getMyProfile(userId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function ensureProfile({ userId, fullName }) {
  const client = requireSupabase();
  const { data: userData } = await client.auth.getUser();
  const roleFromJwt = userData?.user?.app_metadata?.role;
  const email = userData?.user?.email || '';
  const normalizedEmail = email ? normalizeEmail(email) : '';

  const existing = await getMyProfile(userId);
  if (existing) {
    if (roleFromJwt !== 'manager' && normalizedEmail) {
      try {
        const { data: allowRow } = await client
          .from('rep_allowlist')
          .select('full_name')
          .eq('email', normalizedEmail)
          .maybeSingle();

        const allowFullName = allowRow?.full_name?.trim();
        const existingName = String(existing.full_name || '').trim().toLowerCase();

        if (allowFullName && existingName === normalizedEmail && allowFullName !== existing.full_name) {
          const { data, error } = await client
            .from('profiles')
            .update({ full_name: allowFullName })
            .eq('id', userId)
            .select('id, full_name, role')
            .single();

          if (!error && data) return data;
        }
      } catch {
        // Ignore allowlist lookup/update issues; fall back to existing profile.
      }
    }
    return existing;
  }

  let profileFullName = fullName;

  if (roleFromJwt !== 'manager' && normalizedEmail) {
    try {
      const { data: allowRow } = await client
        .from('rep_allowlist')
        .select('full_name')
        .eq('email', normalizedEmail)
        .maybeSingle();

      const allowFullName = allowRow?.full_name?.trim();
      if (allowFullName) profileFullName = allowFullName;
    } catch {
      // Ignore allowlist lookup issues; fall back to provided name/email.
    }
  }

  if (!profileFullName) profileFullName = normalizedEmail || email || 'User';

  const { data, error } = await client
    .from('profiles')
    .insert({
      id: userId,
      full_name: profileFullName,
      role: roleFromJwt === 'manager' ? 'manager' : 'rep'
    })
    .select('id, full_name, role')
    .single();

  if (error) throw error;
  return data;
}

export async function getRepAvailability({ userId, cycleId }) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('submissions')
    .select('availability')
    .eq('user_id', userId)
    .eq('cycle_id', cycleId)
    .maybeSingle();

  if (error) throw error;
  return data?.availability ?? {};
}

export async function submitAvailability({ userId, repName, repEmail, cycleId, availability }) {
  const client = requireSupabase();
  const now = new Date().toISOString();
  const normalizedEmail = repEmail ? normalizeEmail(repEmail) : null;

  const { data, error } = await client
    .from('submissions')
    .upsert(
      {
        user_id: userId,
        rep_name: repName,
        rep_email: normalizedEmail,
        cycle_id: cycleId,
        availability,
        submitted_at: now,
        updated_at: now
      },
      { onConflict: 'user_id,cycle_id' }
    )
    .select('id, cycle_id, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function getAllSubmissions(cycleId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('submissions')
    .select('id, rep_name, rep_email, availability, submitted_at, updated_at, user_id')
    .eq('cycle_id', cycleId)
    .order('rep_name', { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    repName: row.rep_name,
    repEmail: row.rep_email,
    availability: row.availability || {},
    timestamp: row.updated_at || row.submitted_at,
    userId: row.user_id
  }));
}

export async function getSubmittedReps(cycleId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('submissions')
    .select('rep_name')
    .eq('cycle_id', cycleId);

  if (error) throw error;
  return Array.from(new Set((data || []).map((r) => r.rep_name).filter(Boolean)));
}

export async function getAllReps() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getRepAllowlist() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('rep_allowlist')
    .select('rep_id, email, full_name, home_address, home_lat, home_lng, status, employment_type, added_at, added_by')
    .order('email', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addRepToAllowlist({ email, fullName, homeAddress, employmentType, status }) {
  const client = requireSupabase();
  const normalizedEmail = normalizeEmail(email);
  const { data: userData } = await client.auth.getUser();

  const normalizedStatus = status ? String(status).trim().toLowerCase() : null;

  const { data, error } = await client
    .from('rep_allowlist')
    .insert({
      email: normalizedEmail,
      full_name: fullName?.trim() || null,
      home_address: homeAddress?.trim() || null,
      employment_type: employmentType?.trim() || null,
      status: normalizedStatus || undefined,
      added_by: userData?.user?.id ?? null
    })
    .select('rep_id, email, full_name, home_address, home_lat, home_lng, status, employment_type, added_at, added_by')
    .single();

  if (error) throw error;
  return data;
}

export async function upsertRepAllowlist({ email, fullName, homeAddress, employmentType, status, homeLat, homeLng }) {
  const client = requireSupabase();
  const normalizedEmail = normalizeEmail(email);
  const { data: userData } = await client.auth.getUser();

  const normalizedStatus = status ? String(status).trim().toLowerCase() : 'active';
  const normalizedEmploymentType = employmentType ? String(employmentType).trim().toLowerCase() : '';
  if (!normalizedEmploymentType) throw new Error('employment_type is required');
  const normalizedFullName = fullName ? String(fullName).trim() : '';
  if (!normalizedFullName) throw new Error('full_name is required');

  const { data, error } = await client
    .from('rep_allowlist')
    .upsert(
      {
        email: normalizedEmail,
        full_name: normalizedFullName,
        home_address: homeAddress?.trim() || null,
        home_lat: typeof homeLat === 'number' ? homeLat : null,
        home_lng: typeof homeLng === 'number' ? homeLng : null,
        status: normalizedStatus,
        employment_type: normalizedEmploymentType,
        added_by: userData?.user?.id ?? null
      },
      { onConflict: 'email' }
    )
    .select('rep_id, email, full_name, home_address, home_lat, home_lng, status, employment_type, added_at, added_by')
    .single();

  if (error) throw error;
  return data;
}

export async function removeRepFromAllowlist(email) {
  const client = requireSupabase();
  const normalizedEmail = normalizeEmail(email);
  const { error } = await client.from('rep_allowlist').delete().eq('email', normalizedEmail);
  if (error) throw error;
}

export async function deleteSubmission(submissionId) {
  const client = requireSupabase();
  const { error } = await client.from('submissions').delete().eq('id', submissionId);
  if (error) throw error;
}

export async function deleteSubmissionsByRepEmail(repEmail) {
  const client = requireSupabase();
  const normalizedEmail = normalizeEmail(repEmail);
  const { error } = await client.from('submissions').delete().eq('rep_email', normalizedEmail);
  if (error) throw error;
}

export async function isRepAllowlisted(repEmail) {
  const client = requireSupabase();
  const normalizedEmail = normalizeEmail(repEmail);
  const { data, error } = await client
    .from('rep_allowlist')
    .select('email, status')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.email && (data.status || 'active') === 'active');
}
