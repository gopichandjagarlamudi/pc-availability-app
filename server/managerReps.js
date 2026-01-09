const { requireManager, normalizeEmail } = require('./managerExports');

function isValidStatus(value) {
  return value === 'active' || value === 'inactive';
}

function isValidEmploymentType(value) {
  return value === 'full-time' || value === 'part-time';
}

async function geocodeAddress(address) {
  const q = String(address || '').trim();
  if (!q) return { lat: null, lng: null, warning: null };

  const baseUrl = process.env.GEOCODER_BASE_URL || 'https://nominatim.openstreetmap.org';
  const userAgent = process.env.GEOCODER_USER_AGENT || 'pc-availability-app/1.0';

  const url = `${baseUrl.replace(/\/$/, '')}/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': userAgent,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    return { lat: null, lng: null, warning: `Geocoding failed (${response.status}). Saved without lat/lng.` };
  }

  const results = await response.json();
  const first = Array.isArray(results) ? results[0] : null;
  if (!first?.lat || !first?.lon) {
    return { lat: null, lng: null, warning: 'Could not geocode the address. Saved without lat/lng.' };
  }

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { lat: null, lng: null, warning: 'Geocoder returned invalid coordinates. Saved without lat/lng.' };
  }

  return { lat, lng, warning: null };
}

function parseJsonBody(rawBody, isBase64Encoded) {
  if (!rawBody) return null;
  const text = isBase64Encoded ? Buffer.from(rawBody, 'base64').toString('utf8') : rawBody;
  return JSON.parse(text);
}

async function handleUpsertRep({ authorizationHeader, body, isBase64Encoded }) {
  try {
    const auth = await requireManager(authorizationHeader);
    if (!auth.ok) return { statusCode: auth.statusCode, json: { error: auth.message } };

    let payload;
    try {
      payload = typeof body === 'string' ? parseJsonBody(body, isBase64Encoded) : body;
    } catch {
      return { statusCode: 400, json: { error: 'Invalid JSON body' } };
    }

    const email = normalizeEmail(payload?.email);
    if (!email || !email.includes('@')) return { statusCode: 400, json: { error: 'Valid email is required' } };

    const fullName = String(payload?.full_name || payload?.fullName || '').trim() || null;
    if (!fullName) return { statusCode: 400, json: { error: 'full_name is required' } };
    const homeAddress = String(payload?.home_address || payload?.homeAddress || '').trim() || null;
    const employmentTypeRaw = String(payload?.employment_type || payload?.employmentType || '').trim().toLowerCase();
    if (!employmentTypeRaw) return { statusCode: 400, json: { error: 'employment_type is required' } };
    if (!isValidEmploymentType(employmentTypeRaw)) {
      return { statusCode: 400, json: { error: 'Invalid employment_type. Use full-time|part-time.' } };
    }
    const status = String(payload?.status || 'active').trim().toLowerCase();
    if (!isValidStatus(status)) return { statusCode: 400, json: { error: 'Invalid status. Use active|inactive.' } };

    let warning = null;
    let homeLat = null;
    let homeLng = null;
    try {
      const geo = await geocodeAddress(homeAddress);
      warning = geo.warning || null;
      homeLat = geo.lat;
      homeLng = geo.lng;
    } catch (error) {
      console.error('Geocoding error:', error);
      warning = 'Geocoding threw an error. Saved without lat/lng.';
    }

    const { data, error } = await auth.client
      .from('rep_allowlist')
      .upsert(
        {
          email,
          full_name: fullName,
          home_address: homeAddress,
          home_lat: homeLat,
          home_lng: homeLng,
          status,
          employment_type: employmentTypeRaw,
          added_by: auth.user?.id || null
        },
        { onConflict: 'email' }
      )
      .select('rep_id, email, full_name, home_address, home_lat, home_lng, status, employment_type, added_at, added_by')
      .single();

    if (error) throw error;

    return { statusCode: 200, json: { rep: data, warning } };
  } catch (error) {
    console.error('Upsert rep failed:', error);
    return { statusCode: 500, json: { error: error?.message || 'Failed to save rep' } };
  }
}

module.exports = { handleUpsertRep };
