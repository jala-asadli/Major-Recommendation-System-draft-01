import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface NavbarProps {
  isAuthenticated: boolean;
  avatarSource?: string;
  onLogout: () => void;
}

const HOME_HASH_IDS = {
  home: 'esas-sehife',
  about: 'about',
  contact: 'contact'
} as const;

export const Navbar = ({ isAuthenticated, avatarSource = '', onLogout }: NavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const avatarLetter = useMemo(() => (avatarSource.trim().charAt(0) || 'U').toUpperCase(), [avatarSource]);

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
    <header className="home-topbar site-navbar">
      <div className="home-container site-navbar-grid">
        <Link to="/" className="home-brand site-navbar-brand">
          <span>ixtisasly</span>
          <span className="home-brand-mark" aria-hidden="true">
            ✎
          </span>
        </Link>

        <div className="site-navbar-center">
          <nav aria-label="Main navigation" className="site-navbar-links-wrap">
            <ul className="home-nav-list site-navbar-links-primary">
              <li>
                <button type="button" className="site-navbar-link" onClick={() => navigateHomeHash(HOME_HASH_IDS.home)}>
                  Əsas Səhifə
                </button>
              </li>
              <li>
                <button type="button" className="site-navbar-link" onClick={() => navigateHomeHash(HOME_HASH_IDS.about)}>
                  Necə işləyir?
                </button>
              </li>
              <li>
                <button type="button" className="site-navbar-link" onClick={() => navigateHomeHash(HOME_HASH_IDS.contact)}>
                  Əlaqə
                </button>
              </li>
            </ul>
          </nav>

          <button type="button" className="site-navbar-link site-navbar-cta" onClick={() => navigate(isAuthenticated ? '/test' : '/register')}>
            Testə başla
          </button>
        </div>

        <div className="home-nav-actions site-navbar-actions">
          <div className="home-nav-actions-slot">
            {!isAuthenticated ? (
              <>
                <Link to="/register" className="home-register-nav-button">
                  Qeydiyyatdan keç
                </Link>
                <Link to="/login" className="home-login-button">
                  Daxil ol
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
                  aria-label="Profil menyusu"
                >
                  <span className="profile-avatar" aria-hidden="true">
                    {avatarLetter}
                  </span>
                </button>

                {menuOpen && (
                  <div className="profile-menu-list" role="menu">
                    <Link to="/account" className="profile-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Profilim
                    </Link>
                    <Link to="/results" className="profile-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Nəticələrim
                    </Link>
                    <Link to="/settings" className="profile-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Tənzimləmələr
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
    </header>
  );
};
