# Smart Garden - Build & Deployment Guide

## Pre-Build Checklist

✅ Feature-based architecture implemented
✅ Reusable UI components created
✅ API layer centralized
✅ Validation logic separated
✅ App.tsx kept minimal

## Build Commands

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm install
npm run build
```

### Lint Check
```bash
npm run lint
```

## Validation Steps

### 1. Install Dependencies
```bash
npm install
```
Memastikan semua package dependencies terinstall dengan benar.

### 2. Type Check
```bash
npm run lint
```
Memastikan tidak ada TypeScript errors.

### 3. Build Verification
```bash
npm run build
```
Menghasilkan production-ready bundle.

### 4. Build Output
Output akan tersimpan di folder `dist/`:
- `dist/index.html` - Entry point HTML
- `dist/assets/` - JavaScript, CSS, dan static files

## Quality Assurance

### Code Structure
- ✅ App.tsx tidak lebih dari 300 lines
- ✅ Setiap feature punya folder sendiri
- ✅ UI components di components/ui/
- ✅ API calls di lib/api.ts
- ✅ Validation di features/*/validators.ts

### Import Pattern
```typescript
// ✅ GOOD
import { SmartIrrigationPanel } from './features/irrigation';
import { StatusBadge } from './components/ui';
import { api } from './lib/api';

// ❌ AVOID
import SmartIrrigationPanel from './features/irrigation/SmartIrrigationPanel';
import StatusBadge from './components/ui/StatusBadge';
```

### Logic Organization
```
App.tsx              → Navigation + state orchestration only
features/            → Domain logic & specific UI
components/          → Reusable UI & major components
lib/                 → API helper, utilities
utils/               → Small functions, formatters
```

## Performance Tips

### Before Production
1. Run `npm run build` dan verify bundle size
2. Check console untuk warnings atau errors
3. Test responsive layout di berbagai ukuran screen
4. Verify SSE connection stable di network tab
5. Test semua action di irrigation settings

### Deployment
- Deploy `dist/` folder ke production server
- Pastikan environment variables sudah set (API endpoint, dll)
- Setup reverse proxy untuk API calls jika diperlukan
- Enable CORS jika frontend & backend di domain berbeda

## Future Development

Untuk menambah fitur baru, ikuti pola ini:

### Menambah Feature Baru
```bash
mkdir -p src/features/nama-fitur
# Create index.ts, component, validator, etc
```

### Menambah UI Component
```bash
# Buat di src/components/ui/NamaComponent.tsx
# Lalu export di src/components/ui/index.ts
```

### Menambah API Endpoint
```typescript
// Di src/lib/api.ts, tambahkan:
export const api = {
  // ... existing
  newEndpoint: () => request('/api/new-endpoint', { method: 'GET' }),
};
```

## Troubleshooting

### Build Fails
1. Check `npm install` berhasil
2. Verify `npm run lint` pass
3. Clear node_modules dan npm cache, install ulang

### Runtime Errors
1. Check browser console untuk error messages
2. Verify API endpoint accessible
3. Check network tab untuk SSE connection

### Type Errors
1. Run `npm run lint` untuk full type check
2. Verify imports menggunakan relative paths yang benar
3. Check TypeScript types di types/telemetry.ts

## Notes

- Project ini menggunakan Vite sebagai build tool
- Tailwind CSS untuk styling
- React 19 untuk UI framework
- TypeScript untuk type safety
- Express backend (untuk development, di server.ts)

Struktur ini dirancang untuk scalability dan maintainability jangka panjang.
