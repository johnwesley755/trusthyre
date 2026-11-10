import React from 'react';
import { useParams } from 'react-router-dom';
import { ProgrammaticJobHubPage } from '../modules/jobs/pages/ProgrammaticJobHubPage';
import { ProgrammaticHireHubPage } from '../modules/search/pages/ProgrammaticHireHubPage';
import NeighborhoodJobHubPage from '../modules/jobs/pages/NeighborhoodJobHubPage';
import { NotFoundPage } from '../modules/landing/pages/NotFoundPage';

/**
 * PublicDiscoveryRouter handles programmatic dynamic SEO landing pages:
 * 1. Single-segment programmatic job hubs: /jobs-in-:city (e.g. /jobs-in-chennai, /jobs-in-sriperumbudur)
 * 2. Single-segment programmatic hire hubs: /hire-workers-in-:city, /hire-:trade-in-:city
 * 3. Two-segment programmatic job hubs: /jobs-in-:city/:trade (e.g. /jobs-in-chennai/electrician)
 * 4. Micro-locality / Neighborhood hubs: /:city/:neighborhood (e.g. /chennai/guindy)
 * 5. Three-segment neighborhood hubs: /:city/:neighborhood/:trade (e.g. /chennai/guindy/electrician)
 */
export const PublicDiscoveryRouter: React.FC = () => {
  const { cityOrSlug = '', tradeOrNeighborhood = '', trade = '' } = useParams<{
    cityOrSlug?: string;
    tradeOrNeighborhood?: string;
    trade?: string;
  }>();

  const slug = (cityOrSlug || '').toLowerCase().trim();

  // 1. Single Segment Routes (e.g. /jobs-in-sriperumbudur, /jobs-in-chennai, /hire-workers-in-chennai)
  if (!tradeOrNeighborhood) {
    if (slug.startsWith('jobs-in-')) {
      const city = slug.replace(/^jobs-in-/, '').replace(/,/g, '').replace(/-+/g, '-').trim();
      return <ProgrammaticJobHubPage city={city} />;
    }

    if (slug.startsWith('hire-workers-in-')) {
      const city = slug.replace(/^hire-workers-in-/, '').replace(/,/g, '').replace(/-+/g, '-').trim();
      return <ProgrammaticHireHubPage city={city} trade="workers" />;
    }

    const hireMatch = slug.match(/^hire-(.+)-in-(.+)$/);
    if (hireMatch) {
      const parsedTrade = hireMatch[1].replace(/,/g, '').trim();
      const city = hireMatch[2].replace(/,/g, '').trim();
      return <ProgrammaticHireHubPage city={city} trade={parsedTrade} />;
    }

    // Unmatched single segment -> 404 Not Found
    return <NotFoundPage />;
  }

  // 2. Multi-Segment Routes
  if (slug.startsWith('jobs-in-')) {
    const city = slug.replace(/^jobs-in-/, '').replace(/,/g, '').replace(/-+/g, '-').trim();
    return <ProgrammaticJobHubPage city={city} trade={tradeOrNeighborhood} />;
  }

  if (slug.startsWith('hire-workers-in-')) {
    const city = slug.replace(/^hire-workers-in-/, '').replace(/,/g, '').replace(/-+/g, '-').trim();
    return <ProgrammaticHireHubPage city={city} trade={tradeOrNeighborhood} />;
  }

  // 3. City + Neighborhood / Locality Hubs (e.g. /chennai/guindy or /chennai/guindy/electrician)
  return (
    <NeighborhoodJobHubPage
      city={cityOrSlug}
      neighborhood={tradeOrNeighborhood}
      trade={trade}
    />
  );
};

