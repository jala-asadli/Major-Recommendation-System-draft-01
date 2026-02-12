import { motion } from 'framer-motion';
import { Brain, Images, Sparkles, Zap } from 'lucide-react';

export const FeaturesGrid = () => {
  return (
    <section id="about" className="home-new-features">
      <div className="home-new-container">
        <div className="home-new-section-head">
          <h2>Niyə ixtisas.ly?</h2>
          <p>Ənənəvi testlərdən fərqli olaraq, biz sizin əsl maraqlarınızı üzə çıxarırıq.</p>
        </div>

        <div className="home-new-features-grid">
          <motion.article
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="home-new-feature-card home-new-feature-large"
          >
            <div>
              <div className="home-new-feature-icon home-new-feature-icon-teal">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3>Fərdi tövsiyələr</h3>
              <p>
                Süni intellekt alqoritmlərimiz sizin seçimlərinizi analiz edərək, minlərlə ixtisas arasından yalnız sizə uyğun olanları
                seçir.
              </p>
            </div>
            <div className="home-new-progress-track">
              <motion.div
                className="home-new-progress-fill"
                initial={{ width: '0%' }}
                whileInView={{ width: '85%' }}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="home-new-feature-card home-new-feature-orange"
          >
            <div className="home-new-feature-icon home-new-feature-icon-orange">
              <Brain className="h-6 w-6" />
            </div>
            <h3>Psixologiyaya əsaslanan</h3>
            <p>Holland (RIASEC) nəzəriyyəsi əsasında hazırlanmış elmi metodologiya.</p>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="home-new-feature-card home-new-feature-gray"
          >
            <div className="home-new-feature-icon home-new-feature-icon-teal">
              <Zap className="h-6 w-6" />
            </div>
            <h3>Sadə və sürətli</h3>
            <p>Uzun və darıxdırıcı suallar yoxdur. Cəmi 5 dəqiqəyə nəticəni əldə et.</p>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="home-new-feature-card home-new-feature-dark"
          >
            <div className="home-new-feature-dark-copy">
              <div className="home-new-feature-icon home-new-feature-icon-glass">
                <Images className="h-6 w-6" />
              </div>
              <h3>Şəkil əsaslı test</h3>
              <p>Vizual yaddaş və intuitiv seçimlər üzərində qurulmuş unikal test təcrübəsi.</p>
            </div>
            <div className="home-new-feature-dark-grid" aria-hidden="true">
              <div className="home-new-color-cell home-new-color-cell-teal" />
              <div className="home-new-color-cell home-new-color-cell-orange" />
              <div className="home-new-color-cell home-new-color-cell-purple" />
              <div className="home-new-color-cell home-new-color-cell-blue" />
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  );
};
