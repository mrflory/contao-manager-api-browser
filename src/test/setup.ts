import '@testing-library/jest-dom';
import './utils/customMatchers';

// Polyfill for structuredClone (needed for Node.js < 17)
if (!global.structuredClone) {
  global.structuredClone = (obj: any) => {
    if (obj === undefined || obj === null) {
      return obj;
    }
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      // Fallback for objects that can't be serialized
      return obj;
    }
  };
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // uncomment to ignore a specific log level
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock window.fetch for component tests
global.fetch = jest.fn();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Mock ReactRouter hooks for components that use them
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({}),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
  }),
}));

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));