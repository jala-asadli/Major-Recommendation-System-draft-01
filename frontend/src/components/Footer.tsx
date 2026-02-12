interface FooterProps {
  startTestPath: string;
}

export const Footer = ({ startTestPath }: FooterProps) => {
  void startTestPath;
  return (
    <footer id="footer" className="home-new-footer w-full">
      <div className="home-new-footer-inner">
        <div className="home-new-footer-grid">
          <div className="home-new-footer-brand-col">
            <span className="home-new-footer-brand">
              ixtisas<span>.ly</span>
            </span>
            <p>Gənclərin ixtisas seçimini daha dəqiq, daha sürətli və daha inamlı etməsi üçün qurulmuş platforma.</p>
            <span className="home-new-footer-doc-link">Səyahətimiz</span>
          </div>

          <div>
            <h3>Platforma</h3>
            <ul>
              <li><span>Necə işləyir?</span></li>
              <li><span>FAQ</span></li>
              <li><span>Testə başla</span></li>
            </ul>
          </div>

          <div>
            <h3>Komanda</h3>
            <ul>
              <li><span>Founder</span></li>
              <li><span>Co-founder</span></li>
              <li><span>Developer</span></li>
            </ul>
          </div>

          <div>
            <h3>Support & Legal</h3>
            <ul>
              <li><span>Əlaqə</span></li>
              <li><span>Məxfilik siyasəti</span></li>
              <li><span>İstifadə şərtləri</span></li>
              <li><span>support@ixtisas.ly</span></li>
            </ul>
          </div>
        </div>

        <div className="home-new-footer-bottom">
          <p>&copy; {new Date().getFullYear()} ixtisas.ly. Bütün hüquqlar qorunur.</p>
        </div>
      </div>
    </footer>
  );
};
