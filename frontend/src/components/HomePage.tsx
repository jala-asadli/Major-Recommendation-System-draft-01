interface HomePageProps {
  onRegisterClick: () => void;
}

export const HomePage = (_props: HomePageProps) => {
  const { onRegisterClick } = _props;

  return (
    <section className="home-page-shell home">
      <header className="home-topbar">
        <div className="home-container">
          <div className="home-brand">
            <span>ixtisasly</span>
            <div className="home-brand-mark" aria-hidden="true">
              ✎
            </div>
          </div>

          <nav>
            <ul className="home-nav-list">
              <li>
                <a href="#esas-sehife">Əsas Səhifə</a>
              </li>
              <li>
                <a href="#about">Necə işləyir?</a>
              </li>
              <li>
                <a href="#mission">Missiyamız</a>
              </li>
              <li>
                <a href="#contact">Əlaqə</a>
              </li>
            </ul>
          </nav>

          <div className="home-nav-actions">
            <a
              href="/login"
              className="home-register-nav-button"
              onClick={(event) => {
                event.preventDefault();
                onRegisterClick();
              }}
            >
              Qeydiyyatdan keç
            </a>
            <a
              href="/login"
              className="home-login-button"
              onClick={(event) => {
                event.preventDefault();
                onRegisterClick();
              }}
            >
              Daxil ol
            </a>
          </div>
        </div>
      </header>

      <div className="home-container">
        <section className="home-hero" id="esas-sehife">
          <div className="home-section-content">
            <h1>Sənin üçün ən uyğun ixtisası kəşf et</h1>
            <p>Şəkillərə əsaslanan əyləncəli ixtisas testi.</p>
            <div className="home-hero-actions">
              <a
                href="/login"
                className="home-register-button"
                onClick={(event) => {
                  event.preventDefault();
                  onRegisterClick();
                }}
              >
                Qeydiyyatdan keç
              </a>
              <a href="#about" className="home-secondary-button">
                Necə işləyir?
              </a>
            </div>
            <ul className="home-highlights">
              <li>
                <span aria-hidden="true">⏱</span>
                <span>4-5 dəqiqəlik test</span>
              </li>
              <li>
                <span aria-hidden="true">🎯</span>
                <span>Maraq əsaslı tövsiyələr</span>
              </li>
              <li>
                <span aria-hidden="true">✨</span>
                <span>Sadə və rahat</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="home-info-block">
          <div id="about">
            <div className="home-section-content">
              <h2>Necə işləyir?</h2>
              <p className="home-about-lead">
                Bu platforma tələbələrin maraqlarını analiz edərək onlara ən uyğun ixtisasları tövsiyə etmək üçün hazırlanıb. Proses sadə, sürətli və əyləncəlidir.
              </p>
              <div className="home-feature-grid">
                <article className="home-feature-card">
                  <div className="home-feature-icon" aria-hidden="true">
                    MA
                  </div>
                  <h3>Maraq Analizi</h3>
                  <p>Şəkillər və qısa suallar vasitəsilə maraqların müəyyən edilir. Cavabların əsasında sənin maraq profilin formalaşır.</p>
                </article>
                <article className="home-feature-card">
                  <div className="home-feature-icon" aria-hidden="true">
                    AT
                  </div>
                  <h3>Ağıllı Tövsiyə</h3>
                  <p>Toplanan məlumatlar analiz olunur və maraqlarına ən uyğun ixtisaslar ön plana çıxarılır.</p>
                </article>
                <article className="home-feature-card">
                  <div className="home-feature-icon" aria-hidden="true">
                    SB
                  </div>
                  <h3>Sürətli Başlanğıc</h3>
                  <p>Qeydiyyatdan keç → testi tamamla → nəticələri dərhal gör.</p>
                </article>
              </div>
            </div>
          </div>

          <div id="mission" className="home-mission-block">
            <div className="home-section-content">
              <h2>Missiyamız</h2>
              <p>
                Platformamızın əsas məqsədi tələbələrin maraqlarını sistemli şəkildə analiz edərək onlara gələcək təhsil və ixtisas seçimlərində dəstək olmaqdır. Bu yanaşma tələbələrin qərarvermə prosesini daha aydın və əsaslandırılmış edir.
              </p>
              <ul>
                <li>Daha şüurlu qərar</li>
                <li>Daha az tərəddüd, daha çox istiqamət</li>
              </ul>
            </div>
          </div>

          <div id="contact">
            <div className="home-section-content home-contact-footer">
              <section className="home-contact-col home-contact-brand-col">
                <div className="home-brand">
                  <span>ixtisasly</span>
                  <div className="home-brand-mark" aria-hidden="true">
                    ✎
                  </div>
                </div>
              </section>

              <section className="home-contact-col">
                <h3>Yönləndirmə</h3>
                <ul>
                  <li>
                    <a href="#esas-sehife">Əsas Səhifə</a>
                  </li>
                  <li>
                    <a href="#about">Necə işləyir?</a>
                  </li>
                  <li>
                    <a href="#mission">Missiyamız</a>
                  </li>
                </ul>
              </section>

              <section className="home-contact-col">
                <h3>Keçidlər</h3>
                <ul>
                  <li>
                    <a
                      href="/login"
                      onClick={(event) => {
                        event.preventDefault();
                        onRegisterClick();
                      }}
                    >
                      Qeydiyyatdan keç
                    </a>
                  </li>
                  <li>
                    <a
                      href="/login"
                      onClick={(event) => {
                        event.preventDefault();
                        onRegisterClick();
                      }}
                    >
                      Daxil ol
                    </a>
                  </li>
                  <li>
                    <a href="#about">Necə işləyir?</a>
                  </li>
                </ul>
              </section>

              <section className="home-contact-col">
                <h3>Əlaqə</h3>
                <ul className="home-contact-list">
                  <li>
                    <span className="home-contact-icon" aria-hidden="true">
                      📍
                    </span>
                    <span>Ahmadbey Aghaoglu str. 61 Baku, 1008</span>
                  </li>
                  <li>
                    <span className="home-contact-icon" aria-hidden="true">
                      ✉
                    </span>
                    <span>Email: ixtisasly@edu.az</span>
                  </li>
                  <li>
                    <span className="home-contact-icon" aria-hidden="true">
                      ☎
                    </span>
                    <span>Tel: +994 50 988 31 20</span>
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </section>

        <footer className="home-footer">© 2026 ixtisasly. Bütün hüquqlar qorunur.</footer>
      </div>
    </section>
  );
};
