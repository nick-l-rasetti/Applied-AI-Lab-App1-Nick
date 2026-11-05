# System Architecture & Business Overview

## Executive Summary
The **Quarterly Sales Performance & AI Region Analyst** is an executive-grade financial intelligence platform designed to give sales directors and finance leaders instant visibility into quarterly revenue trends across geographic markets. By analyzing transactional sales order records, the application computes deterministic cross-tabulations, interactive multi-quarter trend charts, unit volume movements, and weighted discount rates. To accelerate business reviews, the system automatically produces a strictly grounded, three-sentence executive variance report highlighting the region with the largest quarter-over-quarter shift (Q2 vs. Q3), attributing root-cause drivers across specific product lines and distribution channels, and comparing regional results against total enterprise revenue with zero numerical hallucination.

---

## File Directory & Component Responsibilities

| File Path | Description |
| :--- | :--- |
| `ARCHITECTURE.md` | Provides an executive overview of the application and a comprehensive mapping of every file's business function. |
| `.env.example` | Specifies template configuration variables for the Google Gemini AI API key and deployment endpoints. |
| `index.html` | Defines the main HTML entry document, web typography, metadata tags, and the root element for browser rendering. |
| `metadata.json` | Registers the application's name, capabilities, and server-side Gemini AI integration permissions within AI Studio. |
| `package.json` | Configures the project's software dependencies, execution scripts, and runtime environment for both server and client. |
| `public/assets/aistudio/Lab_1_-_Regional_Sales__1__de1de499.csv` | Houses the primary corporate sales order benchmark dataset loaded on initial dashboard startup. |
| `README.md` | Contains introductory documentation and repository information for the application. |
| `server.ts` | Runs the Node.js/Express backend server, providing the `/api/analyze-q2-q3` AI analytics endpoint and serving the web client. |
| `src/App.tsx` | Serves as the central application orchestrator, managing dataset state, user interactions, and dashboard sections. |
| `src/components/AIExecutiveSummary.tsx` | Renders the verified three-sentence executive variance summary alongside detailed numerical driver audits. |
| `src/components/Header.tsx` | Displays top-level financial KPI badges and action controls for loading sample datasets or uploading files. |
| `src/components/RawDataDrawer.tsx` | Provides an interactive slide-out table allowing users to search, filter, and inspect line-item sales orders. |
| `src/components/RevenueChart.tsx` | Visualizes regional sales distribution and quarterly trends through interactive, responsive bar charts. |
| `src/components/RevenueTable.tsx` | Displays a cross-tabulated pivot matrix detailing quarterly revenue, order volume, and weighted discount rates. |
| `src/components/UploadModal.tsx` | Delivers an intuitive modal dialog enabling business users to drag and drop custom sales CSV files. |
| `src/index.css` | Implements global styling, corporate typography rules, and theme variables via Tailwind CSS. |
| `src/main.tsx` | Mounts the root React component tree into the browser Document Object Model (DOM). |
| `src/types.ts` | Declares TypeScript data structures for sales orders, quarterly performance metrics, and attribution drivers. |
| `src/utils/calculator.ts` | Implements core business logic for CSV parsing, multi-quarter aggregation, and deterministic variance identification. |
| `src/utils/sampleData.ts` | Supplies a fallback multi-region synthetic sales dataset to guarantee continuous dashboard availability. |
| `tsconfig.json` | Establishes TypeScript compiler options and type verification standards across the codebase. |
| `vite.config.ts` | Configures the client build pipeline, React compilation plugins, and development server settings. |
