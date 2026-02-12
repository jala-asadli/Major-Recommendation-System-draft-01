import { motion } from 'framer-motion';
import { BarChart3, GraduationCap, Image } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Şəkilləri seç',
    description: 'Sənə təqdim olunan şəkillərdən maraqlarına uyğun olanları seç.',
    icon: Image,
    color: 'home-new-step-icon-teal',
    numberColor: 'home-new-step-num-teal'
  },
  {
    id: 2,
    title: 'Nəticəni gör',
    description: 'Psixoloji analiz əsasında xarakterinə uyğun sahələri öyrən.',
    icon: BarChart3,
    color: 'home-new-step-icon-orange',
    numberColor: 'home-new-step-num-orange'
  },
  {
    id: 3,
    title: 'İxtisasını tap',
    description: 'Sənə ən uyğun universitet ixtisaslarını və peşələri kəşf et.',
    icon: GraduationCap,
    color: 'home-new-step-icon-teal',
    numberColor: 'home-new-step-num-teal'
  }
] as const;

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="home-new-how">
      <div className="home-new-container">
        <div className="home-new-section-head">
          <h2>Necə işləyir?</h2>
          <p>Mürəkkəb suallar yoxdur. Sadəcə şəkillər və hissləriniz.</p>
        </div>

        <motion.div
          className="home-new-steps-grid"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.3 } } }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {steps.map((step) => (
            <motion.article
              key={step.id}
              variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } }}
              className="home-new-step-card"
            >
              <div className={`home-new-step-num ${step.numberColor}`}>{step.id}</div>
              <div className="home-new-step-content">
                <div className={`home-new-step-icon ${step.color}`}>
                  <step.icon className="h-8 w-8" />
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
