import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  Plus,
  RefreshCw,
  Package,
  Layers,
  AlertTriangle,
  FileText,
  MessageSquare,
  X,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { useLanguage } from '../../i18n/LanguageContext';
import { PageTransition } from '../../components/motion/PageTransition';
import { productsApi, ProductCatalogItem, ProductDetail } from '../../services/api/productsApi';

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Detail modal state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productsApi.getProducts(searchQuery, categoryFilter);
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products repository:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const handleOpenDetail = async (product: ProductCatalogItem) => {
    setSelectedProductId(product.id);
    setDetailLoading(true);
    try {
      const detail = await productsApi.getProductDetail(product.id);
      setProductDetail(detail);
    } catch (err) {
      console.error('Failed to load product detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedProductId(null);
    setProductDetail(null);
  };

  return (
    <PageTransition className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-16">
      <Breadcrumbs items={[{ label: t('nav.products', 'Product Repository') }]} />

      {/* Header */}
      <div className="bg-white rounded-2xl border border-govborder-subtle p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs font-mono font-bold uppercase text-govgreen-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-govgreen-700" />
            NATIONAL COMMODITY PATTERN REGISTRY
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-govink-primary tracking-tight mt-1">
            {t('nav.products', 'Product & Commodity Intelligence')}
          </h1>
          <p className="text-xs sm:text-sm text-govink-secondary mt-1">
            Aggregated cross-inspection repository tracking repeat declarations, cross-panel review signals, and consumer grievance history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProducts}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/scan')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Inspection
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card noPadding>
        <form
          onSubmit={handleSearchSubmit}
          className="p-3.5 sm:p-4 border-b border-cream-400 bg-cream-200/50 flex flex-col md:flex-row items-center gap-2.5 sm:gap-3"
        >
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Commodity name or Brand..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-cream-400 rounded-lg text-xs text-ink-primary focus:outline-none focus:ring-2 focus:ring-forest-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-cream-400 rounded-lg text-xs text-ink-primary focus:outline-none focus:ring-2 focus:ring-forest-600 font-semibold flex-1 md:flex-initial"
            >
              <option value="ALL">All Categories</option>
              <option value="Packaged Food">Packaged Food</option>
              <option value="Personal Care">Personal Care</option>
              <option value="Household Goods">Household Goods</option>
              <option value="Beverages">Beverages</option>
              <option value="Packaged Commodity">General Packaged Commodity</option>
            </select>

            <Button type="submit" size="sm" variant="primary">
              Filter
            </Button>
          </div>
        </form>

        {/* Commodity Pattern Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-cream-200/70 border-b border-cream-400 text-ink-secondary uppercase tracking-wider font-mono">
                <th className="py-3 px-4 font-bold">Commodity &amp; Brand</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold text-center">Inspections</th>
                <th className="py-3 px-4 font-bold text-center">Complaints</th>
                <th className="py-3 px-4 font-bold text-center">Review Signals</th>
                <th className="py-3 px-4 font-bold text-right">Avg Compliance</th>
                <th className="py-3 px-4 font-bold text-right">Last Audited</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-forest-700" />
                    Loading commodity catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-muted">
                    <Package className="w-8 h-8 mx-auto mb-2 text-cream-400" />
                    No commodities found matching current query.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => handleOpenDetail(p)}
                    className="hover:bg-cream-200/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-ink-primary text-sm group-hover:text-forest-700">
                        {p.product_name}
                      </div>
                      <div className="text-[11px] text-ink-muted font-mono">{p.brand}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-cream-200 text-ink-secondary text-[11px] font-semibold">
                        {p.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-ink-primary">
                      {p.inspection_count}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-ink-secondary">
                      {p.complaint_count}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {p.review_signals_count > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {p.review_signals_count} Flags
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Clear
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`font-mono font-bold text-sm ${
                          p.average_score >= 80
                            ? 'text-[#065F46]'
                            : p.average_score >= 50
                            ? 'text-[#92400E]'
                            : 'text-[#991B1B]'
                        }`}
                      >
                        {p.average_score}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-ink-muted text-[11px]">
                      {p.last_inspection_date ? p.last_inspection_date.split('T')[0] : 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button className="px-2.5 py-1 rounded-md text-xs font-bold bg-cream-200 text-ink-primary group-hover:bg-forest-700 group-hover:text-white transition-colors inline-flex items-center gap-1">
                        <span>Patterns</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal: Commodity Pattern View */}
      {selectedProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-cream-400 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-cream-300 bg-cream-100 flex items-start justify-between">
              <div>
                <div className="text-[10px] font-mono font-bold uppercase text-forest-700 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  COMMODITY PATTERN PROFILE
                </div>
                <h2 className="text-xl font-black text-ink-primary mt-1">
                  {productDetail?.product_name || 'Loading Commodity...'}
                </h2>
                <div className="text-xs text-ink-muted font-mono mt-0.5">
                  Brand: {productDetail?.brand} • Category: {productDetail?.category}
                </div>
              </div>
              <button
                onClick={handleCloseDetail}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-cream-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
              {detailLoading ? (
                <div className="py-12 text-center text-ink-muted">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-forest-700" />
                  Aggregating commodity patterns...
                </div>
              ) : productDetail ? (
                <>
                  {/* High Level Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-cream-100 rounded-xl border border-cream-400">
                      <span className="text-[10px] text-ink-muted uppercase font-mono block">Total Audits</span>
                      <span className="text-xl font-bold font-mono text-ink-primary mt-0.5 block">
                        {productDetail.total_inspections}
                      </span>
                    </div>

                    <div className="p-3 bg-cream-100 rounded-xl border border-cream-400">
                      <span className="text-[10px] text-ink-muted uppercase font-mono block">Citizen Complaints</span>
                      <span className="text-xl font-bold font-mono text-ink-primary mt-0.5 block">
                        {productDetail.total_complaints}
                      </span>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-emerald-800 uppercase font-mono block">Avg Compliance</span>
                      <span className="text-xl font-bold font-mono text-emerald-900 mt-0.5 block">
                        {productDetail.average_compliance_score}%
                      </span>
                    </div>
                  </div>

                  {/* Observed Commodity Patterns */}
                  <div>
                    <h3 className="text-xs font-bold text-ink-primary uppercase font-mono mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      Observed Historical Patterns &amp; Review Signals
                    </h3>
                    {productDetail.observed_patterns && productDetail.observed_patterns.length > 0 ? (
                      <div className="space-y-2">
                        {productDetail.observed_patterns.map((p, i) => (
                          <div
                            key={i}
                            className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between"
                          >
                            <span className="font-semibold text-amber-950">{p.pattern}</span>
                            <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono font-bold text-[10px]">
                              {p.occurrences} {p.occurrences === 1 ? 'instance' : 'instances'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-cream-100 rounded-xl border border-cream-300 text-ink-muted">
                        No recurring patterns or cross-panel conflicts flagged for this commodity.
                      </div>
                    )}
                  </div>

                  {/* Inspection History */}
                  <div>
                    <h3 className="text-xs font-bold text-ink-primary uppercase font-mono mb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-forest-700" />
                      Historical Inspections ({productDetail.inspections.length})
                    </h3>
                    <div className="border border-cream-400 rounded-xl overflow-hidden divide-y divide-cream-300">
                      {productDetail.inspections.map((insp) => (
                        <div
                          key={insp.id}
                          className="p-3 flex items-center justify-between hover:bg-cream-100 transition-colors"
                        >
                          <div>
                            <div className="font-mono font-bold text-ink-primary flex items-center gap-2">
                              <span>{insp.inspection_reference}</span>
                              <span className="font-sans">
                                <StatusBadge status={insp.status as any} size="sm" />
                              </span>
                            </div>
                            <div className="text-[10px] text-ink-muted mt-0.5">
                              Audited on: {insp.created_at ? insp.created_at.split('T')[0] : 'N/A'}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-sm text-forest-800">
                              {insp.compliance_score}%
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                handleCloseDetail();
                                navigate(`/inspections/${insp.id}`);
                              }}
                              leftIcon={<ExternalLink className="w-3 h-3" />}
                            >
                              Open
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grievance History */}
                  {productDetail.complaints && productDetail.complaints.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-ink-primary uppercase font-mono mb-2 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-sky-700" />
                        Citizen Complaints ({productDetail.complaints.length})
                      </h3>
                      <div className="border border-cream-400 rounded-xl overflow-hidden divide-y divide-cream-300">
                        {productDetail.complaints.map((comp) => (
                          <div key={comp.id} className="p-3 flex items-center justify-between">
                            <div>
                              <div className="font-mono font-bold text-ink-primary">
                                {comp.complaint_reference}
                              </div>
                              <div className="text-[10px] text-ink-muted">
                                Issue: {comp.issue_category} • Status: {comp.status}
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-ink-muted">
                              {comp.created_at ? comp.created_at.split('T')[0] : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-cream-300 bg-cream-100 flex items-center justify-end">
              <Button variant="outline" size="sm" onClick={handleCloseDetail}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
};
