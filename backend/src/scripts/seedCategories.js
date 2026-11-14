import connectDB, { disconnectDB } from '../config/db.js';
import Category from '../models/Category.js';
import { DEFAULT_CATEGORIES } from '../services/listingLifecycleService.js';

async function run() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Category seed script is disabled in production.');
  }
  await connectDB();
  try {
    for (const cat of DEFAULT_CATEGORIES) {
      await Category.updateOne({ slug: cat.slug }, { $setOnInsert: cat }, { upsert: true });
    }
    console.log('WARESHOP category seed complete.');
  } finally {
    await disconnectDB();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
