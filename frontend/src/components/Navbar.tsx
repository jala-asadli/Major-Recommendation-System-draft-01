import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface NavbarProps {
  isAuthenticated: boolean;
  avatarSource?: string;
  onLogout: () => void;
}

const HOME_HASH_IDS = {
  howItWorks: 'how-it-works'
} as const;

export const Navbar = ({ isAuthenticated, avatarSource = '', onLogout }: NavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const displayName = useMemo(() => {
    const source = avatarSource.trim();
    if (!source) return 'User';
    if (source.includes('@')) {
      return source.split('@')[0];
    }
    return source;
  }, [avatarSource]);
  const avatarLetter = useMemo(() => (displayName.charAt(0) || 'U').toUpperCase(), [displayName]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  const navigateHomeHash = (hashId: string) => {
    if (location.pathname === '/') {
      const target = document.getElementById(hashId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    navigate(`/#${hashId}`);
  };

  return (
    <header className="home-topbar site-navbar home-modern-navbar home-modern-navbar-home">
      <div className="home-container site-navbar-grid">
        <Link to="/" className="home-brand site-navbar-brand home-modern-brand">
          <span>ixtisas</span>
          <span className="home-modern-brand-dot">.ly</span>
        </Link>

        <button
          type="button"
          className="home-modern-menu-button"
          onClick={() => setMobileNavOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={mobileNavOpen}
          aria-controls="home-modern-mobile-menu"
        >
          {mobileNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        <div className="site-navbar-center home-modern-center">
          <nav aria-label="Main navigation" className="site-navbar-links-wrap home-modern-links-wrap">
            <ul className="home-nav-list site-navbar-links-primary home-modern-links">
              <li>
                <button type="button" className="site-navbar-link home-modern-link" onClick={() => navigateHomeHash(HOME_HASH_IDS.howItWorks)}>
                  Necə işləyir?
                </button>
              </li>
            </ul>
          </nav>
        </div>

        <div className="home-nav-actions site-navbar-actions" data-home-hidden="false">
          <div className="home-nav-actions-slot">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="home-modern-auth-link home-modern-auth-link-login"
                >
                  Daxil ol
                </Link>
                <Link
                  to="/register"
                  className="home-modern-auth-link home-modern-auth-link-register"
                >
                  Qeydiyyatdan keç
                </Link>
              </>
            ) : (
              <div className="profile-menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  className="profile-menu-trigger"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  data-open={menuOpen}
                  aria-label="Profil menyusu"
                >
                  <span className="profile-avatar" aria-hidden="true">
                    {avatarLetter}
                  </span>
                  <span className="profile-name">{displayName}</span>
                  <ChevronDown className="profile-trigger-icon" aria-hidden="true" />
                </button>

                {menuOpen && (
                  <div className="profile-menu-list" role="menu">
                    <Link to="/account" className="profile-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Profilim
                    </Link>
                    <Link to="/results" className="profile-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Nəticələrim
                    </Link>
                    <Link to="/test" className="profile-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Testə başla
                    </Link>
                    <div className="profile-menu-divider" aria-hidden="true" />
                    <button
                      type="button"
                      className="profile-menu-item profile-menu-item-logout"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                        navigate('/');
                      }}
                    >
                      Çıxış
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            id="home-modern-mobile-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="home-modern-mobile-menu"
          >
            <div className="home-modern-mobile-menu-inner">
              <button
                type="button"
                className="home-modern-mobile-link"
                onClick={() => {
                  setMobileNavOpen(false);
                  navigateHomeHash(HOME_HASH_IDS.howItWorks);
                }}
              >
                Necə işləyir?
              </button>

              {!isAuthenticated ? (
                <>
                  <Link
                    to="/login"
                    className="home-modern-mobile-link home-modern-mobile-link-login"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Daxil ol
                  </Link>
                  <Link
                    to="/register"
                    className="home-modern-mobile-link home-modern-mobile-link-register"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Qeydiyyatdan keç
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/account" className="home-modern-mobile-link" onClick={() => setMobileNavOpen(false)}>
                    Profilim
                  </Link>
                  <Link to="/results" className="home-modern-mobile-link" onClick={() => setMobileNavOpen(false)}>
                    Nəticələrim
                  </Link>
                  <Link to="/test" className="home-modern-mobile-link" onClick={() => setMobileNavOpen(false)}>
                    Testə başla
                  </Link>
                  <button
                    type="button"
                    className="home-modern-mobile-link home-modern-mobile-link-logout"
                    onClick={() => {
                      setMobileNavOpen(false);
                      onLogout();
                      navigate('/');
                    }}
                  >
                    Çıxış
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
