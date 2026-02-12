import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';
import { buildApiUrl } from '../config';

export const SocialProof = () => {
  const [targetCount, setTargetCount] = useState(0);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    let cancelled = false;

    const loadTotalTests = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/stats/tests'));
        if (!response.ok) {
          throw new Error('Unable to load total tests');
        }
        const payload = (await response.json()) as { totalTests?: unknown };
        const totalTests = typeof payload.totalTests === 'number' ? Math.max(0, Math.floor(payload.totalTests)) : 0;
        if (!cancelled) {
          setTargetCount(totalTests);
        }
      } catch {
        if (!cancelled) {
          setTargetCount(0);
        }
      }
    };

    loadTotalTests();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controls = animate(count, targetCount, {
      duration: 2.5,
      ease: 'easeOut'
    });
    return controls.stop;
  }, [count, targetCount]);

  return (
    <section className="home-new-proof">
      <div className="home-new-container home-new-proof-inner">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="home-new-proof-avatars" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="home-new-proof-avatar" style={{ zIndex: 10 - index }}>
                <div className={`home-new-proof-avatar-fill home-new-proof-avatar-fill-${index}`} />
              </div>
            ))}
          </div>
          <motion.div
            className="home-new-proof-count"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.span>{rounded}</motion.span>
          </motion.div>
          <p className="home-new-proof-copy">tələbə artıq ixtisasını tapdı</p>
        </motion.div>
      </div>
    </section>
  );
};
