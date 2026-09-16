import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ScanLine,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { mockProductRepository } from '../../data/mockProducts';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const product =
    mockProductRepository.find(p => p.id === id) || mockProductRepository[0];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto animate-fadeIn pb-16">
      <div className="flex items-center justify-between">
        <Breadcrumbs
          items={[
            { label: 'Products', href: '/products' },
            { label: product.name },
          ]}
        />
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-xs text-forest-700 hover:text-forest-800 font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Repository</span>
        </Link>
      </div>

      {/* Header */}
      <div className="bg-cream-100 rounded-2xl border border-cream-400 p-4 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-ink-muted mb-1">
            <span className="font-bold text-forest-800 text-sm">{product.id}</span>
            <span>•</span>
            <span>GTIN: {product.gtinOrBarcode}</span>
            <span>•</span>
            <span>Sector: {product.category}</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-ink-primary tracking-tight">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-ink-secondary">
            <span className="bg-cream-200 px-2 py-0.5 rounded font-semibold text-ink-primary border border-cream-300">
              Manufacturer: {product.manufacturer}
            </span>
            <span className="bg-cream-200 px-2 py-0.5 rounded font-semibold text-ink-primary border border-cream-300">
              Brand: {product.brand}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block font-mono">
              Risk Rating
            </span>
            <span
              className={`text-2xl font-mono font-black ${
                product.riskScore > 60
                  ? 'text-[#991B1B]'
                  : product.riskScore > 30
                  ? 'text-[#92400E]'
                  : 'text-[#065F46]'
              }`}
            >
              {product.riskScore}/100
            </span>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/scan')}
            leftIcon={<ScanLine className="w-4 h-4 text-cream-100" />}
          >
            Scan New Batch
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card title="Declared Net Quantity">
          <div className="text-2xl font-mono font-black text-ink-primary">
            {product.netQuantityDeclared}
          </div>
          <p className="text-xs text-ink-secondary mt-1">
            Standard unit of measurement under Rule 11 &amp; 13.
          </p>
        </Card>

        <Card title="Declared Maximum Retail Price">
          <div className="text-2xl font-mono font-black text-ink-primary">
            {product.mrpDeclared}
          </div>
          <p className="text-xs text-ink-secondary mt-1">
            Inclusive of all taxes as mandated under Rule 6(1)(e).
          </p>
        </Card>

        <Card title="Historical Audit Standing">
          <div className="flex items-center gap-2">
            <StatusBadge
              status={
                product.overallCompliance === 'Compliant'
                  ? 'COMPLIANT'
                  : product.overallCompliance === 'Watchlist'
                  ? 'WATCHLIST'
                  : 'HIGH_RISK'
              }
              size="md"
            />
            <span className="text-xs font-mono text-ink-secondary font-bold">
              {product.totalInspections} Inspections
            </span>
          </div>
          <p className="text-xs text-ink-secondary mt-2">
            Last audited on {product.lastInspectedDate}.
          </p>
        </Card>
      </div>
    </div>
  );
};
