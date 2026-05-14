'use client';

// Marketing landing page. Composes the 10 sections from the design handoff
// (see src/doc/prompts/landing-page.md). The root <div> uses the
// .bun-landing-root class to force light tokens — the marketing page is
// always-light by design even when the user's interior theme is dark.

import BunNav from './BunNav';
import BunHero from './BunHero';
import BunMarquee from './BunMarquee';
import BunValueProps from './BunValueProps';
import BunFeatures from './BunFeatures';
import BunWorkflows from './BunWorkflows';
import BunScreenshots from './BunScreenshots';
import BunWhy from './BunWhy';
import BunFAQ from './BunFAQ';
import BunCTA from './BunCTA';
import BunFooter from './BunFooter';

export default function BunLanding() {
  return (
    <div
      className="bun-landing-root"
      style={{
        width: '100%',
        minHeight: '100vh',
        fontFamily: 'var(--v-font-body)',
        overflowX: 'hidden',
      }}
    >
      <BunNav />
      <BunHero />
      <BunMarquee />
      <BunValueProps />
      <BunFeatures />
      <BunWorkflows />
      <BunScreenshots />
      <BunWhy />
      <BunFAQ />
      <BunCTA />
      <BunFooter />
    </div>
  );
}
