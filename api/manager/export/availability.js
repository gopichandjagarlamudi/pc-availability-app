const { handleAvailabilityExport } = require('../../../server/managerExports');

function normalizeQuery(query) {
  const out = {};
  for (const [key, value] of Object.entries(query || {})) {
    out[key] = Array.isArray(value) ? value[0] : value;
  }
  return out;
}

module.exports = async (req, res) => {
  const authorizationHeader = req.headers?.authorization || '';
  const query = normalizeQuery(req.query);

  const result = await handleAvailabilityExport({ authorizationHeader, query });

  if (result.json) {
    res.status(result.statusCode).setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(result.json));
    return;
  }

  for (const [key, value] of Object.entries(result.headers || {})) {
    res.setHeader(key, value);
  }
  res.status(result.statusCode);
  res.end(result.buffer);
};

