const { handleUpsertRep } = require('../../server/managerReps');

exports.handler = async (event) => {
  const authorizationHeader = event.headers?.authorization || event.headers?.Authorization || '';

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const result = await handleUpsertRep({
    authorizationHeader,
    body: event.body,
    isBase64Encoded: Boolean(event.isBase64Encoded)
  });

  return {
    statusCode: result.statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(result.json)
  };
};

