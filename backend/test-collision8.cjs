const crypto = require('crypto');

function generateReferenceId8(type = 'enquiry') {
  const prefix = type === 'partner' ? 'KNV-PTR' : 'KNV-ENQ';
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 hex characters (32 bits)
  return `${prefix}-${randomPart}`;
}

const BATCH_SIZE = 100000;
const seen = new Set();
let duplicates = 0;

for (let i = 0; i < BATCH_SIZE; i++) {
  const id = generateReferenceId8('enquiry');
  if (seen.has(id)) {
    duplicates++;
  } else {
    seen.add(id);
  }
}

console.log(`With 8 hex chars (4 random bytes):`);
console.log(`Generated: ${BATCH_SIZE}, Unique: ${seen.size}, Collisions: ${duplicates}`);
