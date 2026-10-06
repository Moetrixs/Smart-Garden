# Contributing to Smart Garden

Terima kasih sudah berminat berkontribusi! Berikut panduan untuk berkontribusi ke project ini.

## 🎯 Sebelum Mulai

1. Fork repository ini
2. Clone ke local machine: `git clone https://github.com/YOUR_USERNAME/Smart-Garden.git`
3. Create feature branch: `git checkout -b feature/nama-fitur`
4. Install dependencies: `npm install`

## 📝 Code Standards

### TypeScript
- Gunakan strict mode
- Add type annotations untuk function parameters & returns
- Avoid `any` type
- Use interfaces untuk objects

```typescript
// ✅ GOOD
function processData(input: string): Promise<ProcessedData> {
  // ...
}

interface SensorData {
  temperature: number;
  humidity: number;
}

// ❌ AVOID
function processData(input: any): any {
  // ...
}
```

### React Components
- Use functional components
- Keep components small and focused
- Add JSDoc comments
- Use descriptive prop names

```typescript
// ✅ GOOD
/**
 * Displays sensor telemetry data
 * @param telemetry - The telemetry object from API
 * @param isStreaming - Whether SSE connection is active
 */
export const SensorCard: React.FC<SensorCardProps> = ({ telemetry, isStreaming }) => {
  // ...
};

// ❌ AVOID
const SensorCard = ({ data, status }) => {
  // ...
};
```

### Styling
- Use Tailwind CSS classes
- Follow mobile-first approach
- Keep responsive design in mind
- Use consistent spacing (px-3, py-2, gap-2, etc.)

```tsx
// ✅ GOOD
<div className="px-4 py-3 sm:px-6 sm:py-4 rounded-lg border border-slate-800 bg-slate-900">
  {/* Content */}
</div>

// ❌ AVOID
<div style={{ padding: '16px', backgroundColor: '#1e293b' }}>
  {/* Content */}
</div>
```

## 🏗️ Architecture Guidelines

### Feature Development
1. Create feature folder: `src/features/nama-fitur/`
2. Add component, logic, validator di folder tersebut
3. Create `index.ts` untuk barrel export
4. Use di App.tsx atau feature lain

### UI Component Development
1. Create di: `src/components/ui/NamaComponent.tsx`
2. Make it reusable dan stateless jika memungkinkan
3. Export dari: `src/components/ui/index.ts`
4. Use di multiple places

### API Integration
1. Add endpoint di: `src/lib/api.ts`
2. Use type safety untuk request/response
3. Handle errors gracefully

```typescript
// src/lib/api.ts
export const api = {
  // ...
  getNewData: async (): Promise<NewDataResponse> => {
    return request('/api/new-endpoint', {
      method: 'GET',
    });
  },
};
```

## 🧪 Testing Checklist

Sebelum submit PR, pastikan:

- [ ] `npm run lint` pass (no TypeScript errors)
- [ ] `npm run build` berhasil
- [ ] Feature works di browser (desktop & mobile)
- [ ] No console errors atau warnings
- [ ] No breaking changes ke existing features
- [ ] Performance tidak menurun

## 📊 Commit Messages

Gunakan conventional commits format:

```
feat: add new irrigation scheduling feature
fix: correct SSE reconnection logic
refactor: simplify sensor card component
docs: update architecture guide
test: add unit tests for validators
chore: update dependencies
```

## 🔄 Pull Request Process

1. **Create descriptive PR title**
   ```
   feat: Add weather-based irrigation scheduling
   ```

2. **Provide detailed description**
   ```markdown
   ## Changes
   - Add weather API integration
   - Implement rain detection logic
   - Update irrigation schedule based on rainfall

   ## Testing
   - Tested with mock weather data
   - Verified on mobile and desktop

   ## Related Issues
   Fixes #42
   ```

3. **Link related issues**
   ```markdown
   Closes #123
   Related to #456
   ```

4. **Get review** dari maintainers

5. **Address feedback** dan update PR

6. **Merge** setelah approval

## 📂 File Organization

### Feature Module
```
src/features/nama-fitur/
├── NamaFeature.tsx       # Main component
├── validators.ts         # Input validation
├── types.ts              # TypeScript types (if needed)
└── index.ts              # Barrel export
```

### UI Component
```
src/components/ui/
├── NamaComponent.tsx     # Component
├── NamaComponent.types.ts # Types (if complex)
└── index.ts              # Re-export in barrel
```

## 🐛 Bug Reports

Jika menemukan bug:

1. **Check existing issues** apakah sudah dilaporkan
2. **Create detailed report**
   ```markdown
   ## Description
   Brief description of the bug

   ## Steps to Reproduce
   1. Step one
   2. Step two
   3. Step three

   ## Expected Behavior
   What should happen

   ## Actual Behavior
   What actually happens

   ## Screenshots
   If applicable

   ## Environment
   - OS: macOS/Windows/Linux
   - Browser: Chrome/Firefox/Safari
   - Node version: 18.x.x
   ```

## 💡 Feature Requests

Untuk suggest fitur baru:

1. **Check existing issues** apakah sudah di-request
2. **Create detailed proposal**
   ```markdown
   ## Feature Description
   Clear description of the feature

   ## Motivation
   Why this feature is needed

   ## Proposed Solution
   How it should work

   ## Alternative Approaches
   Other ways to solve this
   ```

## 🎓 Learning Resources

- [Architecture Guide](./ARCHITECTURE.md)
- [Build Guide](./BUILD_GUIDE.md)
- [React Docs](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## ❓ Questions?

Jika punya pertanyaan:
- Open GitHub Discussion
- Email: moetrixs17@gmail.com
- Create GitHub Issue dengan label `question`

## 📄 License

Dengan berkontribusi, Anda setuju bahwa kontribusi Anda akan di-license di bawah MIT License.

---

**Thank you for contributing! 🚀**
