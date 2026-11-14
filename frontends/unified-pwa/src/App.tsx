import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { captureReferralParams } from './utils/referralStorage';

function App() {
  useEffect(() => {
    // Capture and persist ?ref=CODE&src=... referral parameters globally across all landing routes
    captureReferralParams();
  }, []);

  return <RouterProvider router={router} />;
}

export default App;
