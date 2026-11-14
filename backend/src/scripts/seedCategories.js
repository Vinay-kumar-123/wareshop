import connectDB, { disconnectDB } from '../config/db.js';
import Category from '../models/Category.js';
const categories = [['Shop', 'shop', 'Retail & Showrooms', 'Store'], ['Office', 'office', 'Commercial & Co-work', 'Building2'], ['Warehouse', 'warehouse', 'Logistics & Large Hubs', 'Warehouse'], ['Godown', 'godown', 'Storage & Small Depot', 'Package']];
async function run() { if (process.env.NODE_ENV === 'production') throw new Error('Category seed is disabled in production.'); await connectDB(); try { for (const [name, slug, description, icon] of categories) await Category.updateOne({ slug }, { $setOnInsert: { name, slug, description, icon, displayOrder: categories.findIndex((item) => item[1] === slug), status: 'ACTIVE' } }, { upsert: true }); console.log('WARESHOP category seed complete.'); } finally { await disconnectDB(); } }
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
