import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CTABannerProps {
  startTestPath: string;
}

export const CTABanner = ({ startTestPath }: CTABannerProps) => {
  return (
    <section className="home-new-cta-section">
      <div className="home-new-container">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="home-new-cta"
        >
          <div className="home-new-cta-bg home-new-cta-bg-left" aria-hidden="true" />
          <div className="home-new-cta-bg home-new-cta-bg-right" aria-hidden="true" />
          <div className="home-new-cta-overlay" aria-hidden="true" />

          <div className="home-new-cta-content">
            <div className="home-new-cta-copy">
              <h2>
                Hazırsan? <br />
                Gələcəyini bu gün kəşf et!
              </h2>
              <p>Cəmi 5 dəqiqə vaxtını ayır və sənə ən uyğun ixtisası tap.</p>
            </div>

            <Link to={startTestPath} className="home-new-cta-button">
              İndi testə başla
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
