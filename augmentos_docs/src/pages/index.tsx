import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Welcome to ${siteConfig.title}`}
      description="AugmentOS Developer Documentation - Build applications for the open-source operating system for smart glasses">
      <HomepageHeader />
      <main>
        <div className="container">
          <div className="padding-vert--lg">
            <div className="margin-vert--lg">
              <Heading as="h2">Welcome to AugmentOS Developer Docs</Heading>
              <p>
                This documentation will guide you through building applications for AugmentOS, 
                the open-source operating system for smart glasses. Whether you're creating 
                third-party apps (TPAs), integrating with AugmentOS APIs, or contributing to 
                the OS itself, you'll find everything you need here.
              </p>
              
              <div className="text--center margin-vert--lg">
                <img 
                  src="/img/augmentos_screenshot.png" 
                  alt="AugmentOS Screenshot" 
                  style={{ maxHeight: '30%', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}
                />
              </div>
              
              <Heading as="h3">Getting Started</Heading>
              <p>
                To begin developing with AugmentOS, set up your environment and explore the SDK.
              </p>
              
              <Heading as="h3">Prerequisites</Heading>
              <p>
                Before you start, ensure you have the following installed:
              </p>
              <ul>
                <li>Node.js (v18 or later)</li>
                <li>Git</li>
                <li>Mobile device running the AugmentOS app</li>
                <li>A compatible smart glasses device (e.g., Mentra Mach1, Even Realities G1, Vuzix Z100)</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}