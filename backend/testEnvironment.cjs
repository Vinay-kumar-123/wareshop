function getMongoDatabaseName(uri) {
  const match = String(uri || '').match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i);
  return match ? decodeURIComponent(match[1]).trim() : '';
}

function isDedicatedTestDatabaseName(name) {
  return /(^|[_-])test([_-]|$)/i.test(String(name || ''));
}

function assertTestEnvironment() {
  const databaseName = getMongoDatabaseName(process.env.MONGODB_URI);
  if (process.env.NODE_ENV !== 'test' || !isDedicatedTestDatabaseName(databaseName)) {
    throw new Error(
      'Refusing integration tests: NODE_ENV=test and a dedicated MongoDB database name containing the test token are required.'
    );
  }
}

module.exports = { getMongoDatabaseName, isDedicatedTestDatabaseName, assertTestEnvironment };
