const { handleUpsertRep } = require('../../server/managerReps');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const authorizationHeader = req.headers?.authorization || '';

  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const body = Buffer.concat(chunks).toString('utf8');
    const result = await handleUpsertRep({ authorizationHeader, body, isBase64Encoded: false });

    res.status(result.statusCode).setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(result.json));
  });
};

