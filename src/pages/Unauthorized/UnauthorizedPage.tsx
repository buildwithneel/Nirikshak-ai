import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Layers, Home } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isOfficer } = useAuth();
  const { t } = useLanguage();

  const handleReturn = () => {
    if (isOfficer) {
      navigate('/dashboard');
    } else {
      navigate('/check');
    }
  };

  return (
    <div className="min-h-screen bg-institutional-bg flex flex-col justify-center items-center p-4 sm:p-6 bg-grid-pattern">
      <div className="w-full max-w-md space-y-6 text-center animate-card-entrance">
        {/* Institutional Badge */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-govred-50 border border-govred-200 text-govred-700 shadow-elevated">
          <ShieldAlert className="w-8 h-8 text-govred-700" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-institutional-border p-6 sm:p-8 shadow-elevated space-y-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-govred-50 text-govred-800 border border-govred-200 text-[11px] font-bold font-mono uppercase tracking-wider">
            AUTHORIZATION NOTICE
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-govink-primary tracking-tight">
            {t('auth.accessRestricted', 'Access Restricted')}
          </h1>

          <p className="text-xs sm:text-sm text-govink-secondary leading-relaxed">
            {t(
              'auth.accessRestrictedDetail',
              'This area is available only to authorized inspection officers.'
            )}
          </p>

          <div className="p-3 bg-institutional-subtle rounded-xl border border-institutional-border text-[11px] text-govink-muted space-y-1">
            <div className="font-semibold text-govink-secondary">
              Signed in as: <span className="font-mono text-govink-primary">{user?.email || 'Authenticated User'}</span>
            </div>
            <div>
              Assigned Role:{' '}
              <span className="font-bold text-govink-primary">
                {user?.role === 'OFFICER' ? 'Inspection Officer' : 'Consumer'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Button
              variant="primary"
              size="lg"
              onClick={handleReturn}
              className="w-full text-xs sm:text-sm font-bold shadow-subtle justify-center"
              leftIcon={<Home className="w-4 h-4" />}
            >
              {t('auth.returnToPortal', 'Return to your portal')}
            </Button>

            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-1.5 text-xs text-govink-secondary hover:text-govink-primary font-medium py-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go back to previous screen</span>
            </button>
          </div>
        </div>

        {/* Institutional Footer Tag */}
        <div className="text-[11px] text-govink-muted flex items-center justify-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-govink-muted" />
          <span>NIRIKSHAK AI • Ministry of Consumer Affairs, Food & Public Distribution</span>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
