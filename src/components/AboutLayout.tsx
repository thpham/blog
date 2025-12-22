import React, { ReactNode } from 'react';
import AboutSidebar from './AboutSidebar';

interface AboutLayoutProps {
  children: ReactNode;
}

const AboutLayout: React.FC<AboutLayoutProps> = ({ children }) => {
  return (
    <div style={{ display: 'flex', maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <AboutSidebar />
      <main style={{ flex: 1, padding: '1rem' }}>
        {children}
      </main>
    </div>
  );
};

export default AboutLayout;
