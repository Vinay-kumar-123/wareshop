// WARESHOP's property-first commercial business directory taxonomy.
export const categories = [
  {
    id: 'shop',
    slug: 'shop',
    name: 'Shop',
    pluralName: 'Shops',
    seoTitle: 'Commercial Shops & Showrooms',
    description:
      'Retail shops, commercial showrooms and high-street storefronts for brands, dealers and distributors.',
    shortDescription: 'Retail & Showrooms',
    icon: 'Store',
    imageUrl: '/images/categories/shop.jpg',
    color: '#EA580C',
    bgColor: '#FFF7ED',
    subcategories: [
      {
        id: 'retail-shop',
        name: 'Retail Shops',
        description: 'High-street, main market and commercial complex retail units.',
      },
      {
        id: 'showroom',
        name: 'Showrooms',
        description: 'Display-ready ground and multi-level showrooms with wide frontage.',
      },
    ],
    popularServices: ['Retail Shop', 'Showroom Space', 'High Street Storefront', 'Corner Commercial Unit'],
  },
  {
    id: 'office',
    slug: 'office',
    name: 'Office',
    pluralName: 'Offices',
    seoTitle: 'Commercial Offices & Coworking',
    description:
      'Corporate office suites, managed workspaces and commercial business centres across major Indian cities.',
    shortDescription: 'Commercial & Co-work',
    icon: 'Building2',
    imageUrl: '/images/categories/office.jpg',
    color: '#1D4ED8',
    bgColor: '#EFF6FF',
    subcategories: [
      {
        id: 'managed-office',
        name: 'Commercial Offices',
        description: 'Furnished and bare-shell corporate office floors and suites.',
      },
      {
        id: 'coworking',
        name: 'Coworking & Business Centres',
        description: 'Managed desks, private cabins and plug-and-play workspaces.',
      },
    ],
    popularServices: ['Commercial Office', 'Managed Workspace', 'Coworking Hub', 'Corporate Suite'],
  },
  {
    id: 'warehouse',
    slug: 'warehouse',
    name: 'Warehouse',
    pluralName: 'Warehouses',
    seoTitle: 'Warehouses & Logistics Hubs',
    description:
      'Large-scale distribution centres, industrial warehouses and multi-dock logistics facilities.',
    shortDescription: 'Logistics & Large Hubs',
    icon: 'Warehouse',
    imageUrl: '/images/categories/warehouse.jpg',
    color: '#047857',
    bgColor: '#ECFDF5',
    subcategories: [
      {
        id: 'distribution-hub',
        name: 'Distribution Hubs',
        description: 'Multi-dock logistics and regional fulfilment hubs near highways.',
      },
      {
        id: 'industrial-warehouse',
        name: 'Industrial Warehouses',
        description: 'High-clearance PEB sheds and industrial storage facilities.',
      },
    ],
    popularServices: ['Distribution Hub', 'Fulfilment Centre', 'Industrial Warehouse', 'Cold & Dry Logistics'],
  },
  {
    id: 'godown',
    slug: 'godown',
    name: 'Godown',
    pluralName: 'Godowns',
    seoTitle: 'Godowns & Storage Depots',
    description:
      'Small and medium storage facilities, wholesale stock depots and city-accessible inventory godowns.',
    shortDescription: 'Storage & Small Depot',
    icon: 'Package',
    imageUrl: '/images/categories/godown.jpg',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    subcategories: [
      {
        id: 'storage-depot',
        name: 'Storage Depots',
        description: 'City-edge and market-adjacent depots for wholesale traders.',
      },
      {
        id: 'goods-storage',
        name: 'Goods & Inventory Godowns',
        description: 'Secure commercial storage units for stock and distribution.',
      },
    ],
    popularServices: ['Goods Storage', 'Wholesale Godown', 'Local Stock Depot', 'Inventory Storage'],
  },
];

export const getCategoryBySlug = (slug) =>
  categories.find((category) => category.slug === String(slug || '').toLowerCase());

export const getAllCategorySlugs = () => categories.map((category) => category.slug);
