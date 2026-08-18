# KYC-UI

React UI for KYC APIs (Step 2 IFC Category + Step 3 Raw Material Permissibility).

## Run

```bash
cd KYC-UI
npm install
npm run dev
```

Open http://localhost:3000

Make sure the AI Mainframe API is running on http://localhost:5000 (`docker compose up` in `ai-mainframe`).

Vite proxies:
- `/kyc/*` → `http://localhost:5000`
- `/category_id/*` → `http://localhost:5000`
