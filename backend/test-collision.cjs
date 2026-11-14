const { generateReferenceId } = require('./src/utils/referenceId.js');

const BATCH_SIZE = 100000;
const seen = new Set();
let duplicates = 0;

for (let i = 0; i < BATCH_SIZE; i++) {
  const id = generateReferenceId('enquiry');
  if (seen.has(id)) {
    duplicates++;
  } else {
    seen.add(id);
  }
}

console.log(`Generated: ${BATCH_SIZE}, Unique: ${seen.size}, Collisions: ${duplicates}`);
