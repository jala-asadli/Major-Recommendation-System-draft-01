import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeroSectionProps {
  startTestPath: string;
}

export const HeroSection = ({ startTestPath }: HeroSectionProps) => {
  return (
    <section className="home-new-hero" id="esas-sehife">
      <div className="home-new-bg" aria-hidden="true">
        <motion.div
          className="home-new-bg-teal"
          animate={{ y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="home-new-bg-orange"
          animate={{ y: [0, -40, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="home-new-shape-ring"
          animate={{ y: [0, -20, 0], rotate: 360 }}
          transition={{ y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }, rotate: { duration: 20, repeat: Infinity, ease: 'linear' } }}
        />
        <motion.div
          className="home-new-shape-square"
          animate={{ y: [0, 30, 0], rotate: [12, 45, 12] }}
          transition={{ y: { duration: 5, repeat: Infinity, ease: 'easeInOut' }, rotate: { duration: 15, repeat: Infinity, ease: 'easeInOut' } }}
        />
        <motion.div
          className="home-new-shape-dot"
          animate={{ x: [0, 20, 0], y: [0, 15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="home-new-shape-triangle"
          animate={{ rotate: [0, 10, 0], y: [0, -15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="home-new-hero-content">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
          <span className="home-new-pill">Gələcəyini kəşf et</span>

          <h1>
            Sənin üçün ən uyğun <br />
            <span>ixtisası tap</span>
          </h1>

          <p>Sadə, şəkil əsaslı RIASEC testi ilə maraqlarını kəşf et və sənə ən uyğun peşəni tap. Cəmi 5 dəqiqə vaxtını ayır.</p>

          <div className="home-new-hero-actions">
            <Link to={startTestPath} className="home-new-btn home-new-btn-primary">
              Testə başla
              <ArrowRight className="h-5 w-5" />
            </Link>

            <a href="#how-it-works" className="home-new-btn home-new-btn-secondary">
              <PlayCircle className="h-5 w-5" />
              Necə işləyir?
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
