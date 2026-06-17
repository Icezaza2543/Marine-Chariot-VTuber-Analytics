export const STACK_ARCHITECTURE = {
  framework: 'Vite + React + TypeScript single page application',
  styling: 'Tailwind CSS v4 + daisyUI theme tokens + project CSS components',
  charting: [
    'Chart.js',
    'react-chartjs-2',
    'chartjs-plugin-zoom',
    'chartjs-plugin-annotation',
    'chartjs-plugin-datalabels',
    'Recharts',
  ],
  stateManagement: 'Zustand for dashboard filters, table sorting, and UI state',
  formsAndValidation: 'React Hook Form + Zod for the advanced filter system',
  dateHandling: 'date-fns for ISO parsing, calendar grouping, and range math',
  csvPipeline:
    'Papa Parse reads the live Google Sheet CSV at runtime with public/data/marine-ch-data.csv as fallback',
  socialPipeline:
    'scripts/fetch-x-data.mjs pulls X API v2 data into public/data/marine-x-posts.json; the app merges it as social signal analytics',
  deployment:
    'Vercel-ready Vite static deployment via vercel.json, build:vercel, dist output, and optional build-time X data refresh',
  animation: 'Framer Motion for entrance and hover motion',
  dataScience: [
    'Linear regression forecast',
    'Exponential smoothing forecast',
    'Weighted viral potential scoring',
    'X cross-promotion matching and social lift scoring',
    'Duration-based retention approximation',
  ],
} as const
