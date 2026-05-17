'use client';

// Mobile version of the Bún landing page. Composes 11 sections per the
// design handoff at design/design_handoff_bun_mobile/README.md §3.
// Designed at 402px width.

import MNav from './MNav';
import MHero from './MHero';
import MMarquee from './MMarquee';
import MValueProps from './MValueProps';
import MFeatures from './MFeatures';
import MWorkflows from './MWorkflows';
import MScreenshots from './MScreenshots';
import MWhy from './MWhy';
import MFaq from './MFaq';
import MCTA from './MCTA';
import MFooter from './MFooter';

export default function BunLandingMobile() {
  return (
    <div
      className="bun-landing-root"
      style={{
        width: '100%',
        minHeight: '100vh',
        fontFamily: 'var(--v-font-body)',
        overflowX: 'hidden',
        background: 'var(--v-bg)',
      }}
    >
      <MNav />
      <MHero />
      <MMarquee />
      <MValueProps />
      <MFeatures />
      <MWorkflows />
      <MScreenshots />
      <MWhy />
      <MFaq />
      <MCTA />
      <MFooter />
    </div>
  );
}
