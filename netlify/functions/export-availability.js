const { handleAvailabilityExport } = require('../../server/managerExports');

exports.handler = async (event) => {
  const authorizationHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const query = event.queryStringParameters || {};

  const result = await handleAvailabilityExport({ authorizationHeader, query });

  if (result.json) {
    return {
      statusCode: result.statusCode,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(result.json)
    };
  }

  return {
    statusCode: result.statusCode,
    headers: result.headers,
    body: result.buffer.toString('base64'),
    isBase64Encoded: true
  };
};

