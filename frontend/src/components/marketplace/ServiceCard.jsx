import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers, Hammer, Heart, Code, CheckCircle } from 'lucide-react';
import Badge from '../common/Badge.jsx';

const iconMap = {
  Layers,
  Hammer,
  Heart,
  Code,
};

export default function ServiceCard({ service }) {
  const IconComponent = iconMap[service.icon] || Layers;

  return (
    <div className="card-hover bg-white p-5 sm:p-6 flex flex-col justify-between h-full border-border/80">
      <div>
        {/* Top bar: Category badge + Icon */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <Badge variant="teal">{service.categoryName}</Badge>
          <div className="w-9 h-9 rounded-md bg-accent-50 flex items-center justify-center flex-shrink-0">
            <IconComponent className="w-5 h-5 text-accent" aria-hidden="true" />
          </div>
        </div>

        {/* Service Title */}
        <h3 className="text-base sm:text-lg font-bold text-primary mb-2 line-clamp-1">
          {service.name}
        </h3>

        {/* Short Description */}
        <p className="text-text-muted text-xs sm:text-sm leading-relaxed mb-4 line-clamp-2">
          {service.shortDescription || service.description}
        </p>

        {/* Key benefits / offerings snippet */}
        {service.serviceTypes && service.serviceTypes.length > 0 && (
          <ul className="space-y-1.5 mb-5 text-xs text-text-primary/80" aria-label="Key offerings">
            {service.serviceTypes.slice(0, 2).map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5 line-clamp-1">
                <CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="truncate">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Action Links */}
      <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
        <Link
          to={`/services/${service.slug}`}
          className="text-xs sm:text-sm font-semibold text-primary hover:text-accent transition-colors flex items-center gap-1"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>

        <Link
          to={`/providers?search=${encodeURIComponent(service.name)}&category=${encodeURIComponent(service.categorySlug)}`}
          className="text-xs font-semibold text-accent hover:underline py-1 px-2.5 bg-accent-50/60 rounded"
        >
          Get Quote
        </Link>
      </div>
    </div>
  );
}
