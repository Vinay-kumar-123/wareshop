// DEVELOPMENT SAMPLE DATA ONLY. These listings are fictional UI fixtures, never customer records.
export const DEV_DATA_WARNING = 'DEVELOPMENT_SAMPLE_ONLY';

const listings = [
  ['sunrise-retail-store', 'Sunrise Retail Store', 'Shop', 'Mumbai, Maharashtra', 'Retail Shop', ['Retail storefront', 'Display fit-out', 'High-street location']],
  ['city-fashion-house', 'City Fashion House', 'Shop', 'New Delhi, Delhi', 'Showroom Space', ['Fashion showroom', 'Retail lease', 'Customer parking']],
  ['metro-electronics', 'Metro Electronics', 'Shop', 'Bengaluru, Karnataka', 'Retail Shop', ['Electronics retail', 'Showroom space', 'Store setup']],
  ['workspace-business-centre', 'WorkSpace Business Centre', 'Office', 'Pune, Maharashtra', 'Managed Office', ['Private cabins', 'Meeting rooms', 'Reception services']],
  ['prime-corporate-office', 'Prime Corporate Office', 'Office', 'Gurugram, Haryana', 'Private Office', ['Grade A office', 'Managed workspace', 'Business address']],
  ['smart-cowork-hub', 'Smart Co-Work Hub', 'Office', 'Hyderabad, Telangana', 'Co-working Desk', ['Flexible desks', 'Team suites', 'High-speed internet']],
  ['eastern-logistics-hub', 'Eastern Logistics Hub', 'Warehouse', 'Kolkata, West Bengal', 'Distribution Hub', ['Dock loading', '3PL support', 'Inventory handling']],
  ['national-distribution-centre', 'National Distribution Centre', 'Warehouse', 'Chennai, Tamil Nadu', 'Fulfilment Centre', ['B2B distribution', 'Pick and pack', 'Transport access']],
  ['prime-industrial-warehouse', 'Prime Industrial Warehouse', 'Warehouse', 'Ahmedabad, Gujarat', 'Industrial Storage', ['Large floor plate', 'Security', 'Industrial access']],
  ['city-storage-depot', 'City Storage Depot', 'Godown', 'Jaipur, Rajasthan', 'Local Depot', ['Short-term storage', 'Local dispatch', 'Goods handling']],
  ['safestock-godown', 'SafeStock Godown', 'Godown', 'Lucknow, Uttar Pradesh', 'Goods Storage', ['Secure storage', 'Inventory space', 'Flexible terms']],
  ['metro-goods-storage', 'Metro Goods Storage', 'Godown', 'Kochi, Kerala', 'Inventory Storage', ['Dry storage', 'Small depot', 'Local logistics']],
];

export const providers = listings.map(([slug, businessName, categoryName, location, mainService, servicesOffered], index) => ({
  id: `wareshop-demo-${String(index + 1).padStart(2, '0')}`,
  slug,
  businessName: `${businessName} (Sample Listing)`,
  categoryName,
  categorySlug: categoryName.toLowerCase(),
  location,
  city: location.split(',')[0],
  mainService,
  description: `Development sample for ${businessName}. Explore the listing format, services and enquiry journey; this is not a live business profile.`,
  servicesOffered,
  serviceAreas: [location.split(',')[0]],
  verificationStatus: 'unverified',
  publicationStatus: 'published',
  isDevSample: true,
  rating: null,
  reviewCount: 0,
  portfolio: [],
}));

export const getProviderBySlug = (slug) => providers.find((provider) => provider.slug === slug);
export const getProvidersByCategory = (categorySlug) => providers.filter((provider) => provider.categorySlug === categorySlug);
export const getActiveProviders = () => providers.filter((provider) => provider.publicationStatus === 'published');
