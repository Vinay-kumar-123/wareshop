import connectDB, { disconnectDB } from '../config/db.js';
import Provider from '../models/Provider.js';

// Development-only fixtures. This script is deliberately opt-in and never runs at server startup.
const records = [
  ['sunrise-retail-store', 'Sunrise Retail Store', 'Shop', 'Mumbai', 'Maharashtra', 'Retail Shop'], ['city-fashion-house', 'City Fashion House', 'Shop', 'New Delhi', 'Delhi', 'Showroom Space'], ['metro-electronics', 'Metro Electronics', 'Shop', 'Bengaluru', 'Karnataka', 'Retail Shop'],
  ['workspace-business-centre', 'WorkSpace Business Centre', 'Office', 'Pune', 'Maharashtra', 'Managed Office'], ['prime-corporate-office', 'Prime Corporate Office', 'Office', 'Gurugram', 'Haryana', 'Private Office'], ['smart-cowork-hub', 'Smart Co-Work Hub', 'Office', 'Hyderabad', 'Telangana', 'Co-working Desk'],
  ['eastern-logistics-hub', 'Eastern Logistics Hub', 'Warehouse', 'Kolkata', 'West Bengal', 'Distribution Hub'], ['national-distribution-centre', 'National Distribution Centre', 'Warehouse', 'Chennai', 'Tamil Nadu', 'Fulfilment Centre'], ['prime-industrial-warehouse', 'Prime Industrial Warehouse', 'Warehouse', 'Ahmedabad', 'Gujarat', 'Industrial Storage'],
  ['city-storage-depot', 'City Storage Depot', 'Godown', 'Jaipur', 'Rajasthan', 'Local Depot'], ['safestock-godown', 'SafeStock Godown', 'Godown', 'Lucknow', 'Uttar Pradesh', 'Goods Storage'], ['metro-goods-storage', 'Metro Goods Storage', 'Godown', 'Kochi', 'Kerala', 'Inventory Storage'],
];

async function run() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production.');
  await connectDB();
  try {
    for (const [slug, businessName, category, city, state, service] of records) {
      await Provider.updateOne({ slug }, { $set: { businessName: `${businessName} (Sample Listing)`, providerName: 'WARESHOP Development', slug, description: `Development sample listing for ${businessName}. This record is not a live business.`, category, categorySlug: category.toLowerCase(), services: [service], city, state, serviceAreas: [city], verificationStatus: 'UNVERIFIED', publicationStatus: 'DRAFT', publicationConsent: false, isDemo: true } }, { upsert: true });
    }
    console.log(`Upserted ${records.length} WARESHOP demo providers.`);
  } finally { await disconnectDB(); }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
