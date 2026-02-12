import { CTABanner } from './CTABanner';
import { Footer } from './Footer';
import { HeroSection } from './HeroSection';
import { HowItWorks } from './HowItWorks';
import { SocialProof } from './SocialProof';
import type { UserProfile } from '../types';

interface HomePageProps {
  user?: UserProfile | null;
}
export const HomePage = ({ user = null }: HomePageProps) => {
  const startTestPath = user ? '/test' : '/register';

  return (
    <section className="home-page-shell home home-new-page" id="esas-sehife">
      <HeroSection startTestPath={startTestPath} />
      <HowItWorks />
      <SocialProof />
      <CTABanner startTestPath={startTestPath} />
      <Footer startTestPath={startTestPath} />
    </section>
  );
};
