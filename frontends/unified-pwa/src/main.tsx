import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './providers/ThemeContext';
import { AuthProvider } from './providers/AuthContext';
import { QueryProvider } from './providers/QueryProvider';
import { TranslationProvider } from './providers/TranslationContext';
import { SearchProvider } from './providers/SearchContext';
import './index.css';
import './App.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider defaultTheme="light">
    <AuthProvider>
      <QueryProvider>
        <TranslationProvider>
          <SearchProvider>
            <App />
          </SearchProvider>
        </TranslationProvider>
      </QueryProvider>
    </AuthProvider>
  </ThemeProvider>,
);

