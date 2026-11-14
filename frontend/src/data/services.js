// Structured seed data for marketplace services
// Supports detail pages, FAQ schemas, and service-level enquiry links

export const services = [
  {
    id: 'interior-design',
    slug: 'interior-design',
    name: 'Interior Design',
    categorySlug: 'home-construction',
    categoryName: 'Home & Construction',
    description: 'Transform your residential or commercial space with licensed interior architects and decorators. From space planning and 3D visual mockups to turnkey execution and material selection, get tailored interior solutions.',
    shortDescription: 'Custom residential and commercial interior architecture and styling.',
    icon: 'Layers',
    serviceTypes: [
      'Turnkey Residential Interiors (1BHK/2BHK/3BHK/Villas)',
      'Modular Kitchen Design & Installation',
      'Commercial & Office Workspace Interiors',
      'False Ceiling & Architectural Lighting',
      'Custom Wardrobes & Space Saving Furniture',
      '3D Renderings & Floor Plan Optimization',
    ],
    benefits: [
      'Maximized functional space and modern ergonomic flow',
      'Direct vendor access with transparent material specification',
      'Dedicated project manager oversight from design to handover',
      'Clear milestone schedules with quality checkpoints',
    ],
    serviceAreas: ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad'],
    faqs: [
      {
        q: 'What is the typical cost range for interior design in India?',
        a: 'Interior design costs depend on whether you choose turnkey execution or design-only consulting. Turnkey 2BHK projects generally range between ₹3.5 Lakh to ₹10 Lakh+ depending on laminate vs. acrylic finishes, hardware brands, and civil modifications.',
      },
      {
        q: 'How does KONNEVIA match me with an interior designer?',
        a: 'When you submit an enquiry with your property details, budget, and location, our marketplace team manually reviews your requirements and pairs you with up to 2 verified designers who specialize in your project scope.',
      },
      {
        q: 'What is the average timeline for complete apartment interiors?',
        a: 'Standard modular woodwork and finishing for a 2BHK takes roughly 45–60 days post design finalization. Civil modifications, flooring changes, or structural additions may extend the timeline to 75–90 days.',
      },
    ],
    metaTitle: 'Interior Design Services in India — KONNEVIA',
    metaDescription: 'Find vetted interior designers and turnkey contractors for homes and offices on KONNEVIA. Get transparent quotes tailored to your budget.',
  },
  {
    id: 'home-renovation',
    slug: 'home-renovation',
    name: 'Home Renovation',
    categorySlug: 'home-construction',
    categoryName: 'Home & Construction',
    description: 'Breathe new life into aging apartments and homes with complete civil renovation, bathroom waterproofing, electrical upgrades, flooring replacement, and structural revamps.',
    shortDescription: 'Full-home remodeling, waterproofing, civil repairs, and upgrades.',
    icon: 'Hammer',
    serviceTypes: [
      'Complete Apartment Civil Overhaul',
      'Bathroom Remodeling & Waterproofing',
      'Kitchen Structural Modernization',
      'Tile & Italian Marble Flooring Work',
      'Concealed Electrical & Plumbing Replacements',
      'Structural Wall Modifications (Post Structural Audit)',
    ],
    benefits: [
      'Extend structural longevity and resolve persistent seepage',
      'Significantly improve property resale and rental value',
      'Modernize layout to open-concept living arrangements',
      'Full civil team coordination under single accountability',
    ],
    serviceAreas: ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai'],
    faqs: [
      {
        q: 'Can I stay in the apartment during full civil renovation?',
        a: 'For partial updates like single-room painting or modular kitchen retrofits, you may remain. Full civil renovations involving tile breaking, bathroom waterproofing, and electrical re-wiring generate heavy dust and noise, making temporary relocation strongly recommended.',
      },
      {
        q: 'Are waterproofing repairs covered under warranty?',
        a: 'Reputable contractors onboarded on KONNEVIA provide standard written warranties (typically 3 to 5 years) on specialized chemical waterproofing treatments.',
      },
    ],
    metaTitle: 'Home Renovation & Remodeling Contractors — KONNEVIA',
    metaDescription: 'Find experienced renovation contractors for complete apartment remodeling, waterproofing, and structural upgrades on KONNEVIA.',
  },
  {
    id: 'wedding-planning',
    slug: 'wedding-planning',
    name: 'Wedding Planning',
    categorySlug: 'events-lifestyle',
    categoryName: 'Events & Lifestyle',
    description: 'Craft unforgettable celebrations with professional wedding planners. From destination logistics and venue curation to themed décor, entertainment, hospitality, and day-of coordination.',
    shortDescription: 'Turnkey wedding curation, venue scouting, and event production.',
    icon: 'Heart',
    serviceTypes: [
      'Full-Scale Destination Wedding Planning',
      'Local City Wedding Production & Decor',
      'Vendor Management (Catering, Mehendi, DJ, Sound)',
      'Guest Logistics & Hospitality Coordination',
      'Theme Conceptualization & Floral Artistry',
      'Day-of Shadow Coordination',
    ],
    benefits: [
      'Stress-free celebrations for the couple and families',
      'Negotiated vendor rates and transparent line-item budgeting',
      'Rigorous timeline execution with on-ground hospitality staff',
      'Contingency management for weather and technical backups',
    ],
    serviceAreas: ['Udaipur', 'Jaipur', 'Goa', 'Mumbai', 'Delhi NCR', 'Bengaluru', 'Kerala'],
    faqs: [
      {
        q: 'When should we hire a wedding planner?',
        a: 'For peak destination dates (November through February in Rajasthan or Goa), hiring 8 to 12 months in advance ensures prime venue booking and optimal room tariffs.',
      },
      {
        q: 'Does the planner handle our budget management?',
        a: 'Yes, a dedicated planner builds a line-item budget tracker, manages vendor payment schedules, and ensures expenses remain aligned with your agreed ceiling.',
      },
    ],
    metaTitle: 'Wedding Planners & Event Coordinators — KONNEVIA',
    metaDescription: 'Discover verified wedding planners for destination and luxury celebrations across India on KONNEVIA.',
  },
  {
    id: 'website-development',
    slug: 'website-development',
    name: 'Website Development',
    categorySlug: 'digital-professional',
    categoryName: 'Digital & Professional Services',
    description: 'Build fast, responsive, and conversion-engineered web solutions. We connect businesses with proven front-end, full-stack, and headless e-commerce engineering agencies.',
    shortDescription: 'Modern custom websites, web applications, and headless commerce.',
    icon: 'Code',
    serviceTypes: [
      'Corporate & Brand Marketing Websites',
      'E-commerce Stores (Shopify, WooCommerce, Custom)',
      'Custom Web Applications & Portals (React, Node, Next.js)',
      'API Integrations & Payment Gateways',
      'Page Speed & Core Web Vitals Optimization',
      'Ongoing Website Maintenance & Security Support',
    ],
    benefits: [
      'Lightning-fast page speeds optimized for Google Core Web Vitals',
      'Clean, maintainable source code owned entirely by your business',
      'Responsive design tested across modern mobile viewports',
      'Built-in technical SEO architecture and metadata scaffolding',
    ],
    serviceAreas: ['Pan-India (Remote Delivery Available)'],
    faqs: [
      {
        q: 'Who owns the website code and assets upon completion?',
        a: 'You retain 100% intellectual property ownership of all custom code, graphic assets, and domain configurations upon final milestone settlement.',
      },
      {
        q: 'How long does developing a modern business website take?',
        a: 'A high-converting 5–8 page corporate website typically takes 3 to 4 weeks. Custom e-commerce portals or web apps usually span 6 to 12 weeks depending on integrations.',
      },
    ],
    metaTitle: 'Website Development Services & Agencies — KONNEVIA',
    metaDescription: 'Find verified website developers and software agencies for high-performance business websites and web applications on KONNEVIA.',
  },
];

export const getServiceBySlug = (slug) => services.find((s) => s.slug === slug);
export const getServicesByCategory = (categorySlug) => services.filter((s) => s.categorySlug === categorySlug);
