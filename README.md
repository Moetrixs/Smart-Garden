# 🌱 Smart Garden - IoT Dashboard

Sistem monitoring dan kontrol otomatis untuk taman cerdas dengan sensor realtime dan scheduling irigasi berbasis web.

## ✨ Fitur Utama

### 📊 Real-time Telemetry
- Monitoring sensor suhu, kelembaban, dan kelembaban tanah secara live
- Server-Sent Events (SSE) untuk streaming data realtime
- Network status indicator dan connection management
- Historical data tracking (last 150 records)

### 💧 Smart Irrigation Control
- Manual irrigation trigger
- Scheduled irrigation (pagi/sore)
- Soil moisture threshold configuration
- Duration control untuk setiap siklus penyiraman
- Password-protected settings

### 🔐 Security
- Admin password authentication untuk akses pengaturan irigasi
- Encrypted password storage (localStorage)
- Session management dan access control

### 📱 Responsive Design
- Mobile-first UI dengan Tailwind CSS
- Works on desktop, tablet, dan mobile devices
- Dark theme untuk kenyamanan mata
- Real-time status indicators

## 🏗️ Architecture

Project ini dibangun dengan pendekatan **feature-based architecture** untuk scalability dan maintainability:

```
src/
├── App.tsx                    # Main app orchestrator
├── components/
│   ├── TopBar.tsx            # Navigation & status
│   ├── SensorCards.tsx       # Telemetry display
│   └── ui/                   # Reusable UI components
├── features/
│   ├── telemetry/           # Real-time data streaming
│   └── irrigation/          # Scheduling & control
├── lib/
│   └── api.ts               # Centralized API layer
├── hooks/
│   └── useTelemetry.ts      # Real-time state management
└── utils/
    ├── audioAlert.ts        # Audio feedback
    └── formatters.ts        # Data formatting
```

Untuk dokumentasi lengkap, lihat [ARCHITECTURE.md](./ARCHITECTURE.md)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm atau yarn

### Installation

```bash
# Clone repository
git clone https://github.com/Moetrixs/Smart-Garden.git
cd Smart-Garden

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

### Production Build

```bash
# Build untuk production
npm run build

# Preview production build
npm run preview
```

Lihat [BUILD_GUIDE.md](./BUILD_GUIDE.md) untuk panduan build detail.

## 📋 Usage

### Dashboard Tab
1. Buka aplikasi di browser
2. Lihat sensor data secara realtime
3. Tekan "Picu Penyiraman" untuk manual irrigation
4. Lihat network status di header bar

### Irrigation Tab
1. Klik tab "Pengaturan Irigasi"
2. Masukkan password admin (default: `admin123`)
3. Atur jadwal penyiraman (pagi/sore)
4. Set durasi dan soil moisture threshold
5. Simpan pengaturan

### Configuration
Edit file `.env` untuk konfigurasi API endpoint:

```env
VITE_API_BASE_URL=http://localhost:3001
```

## 🔧 API Endpoints

Aplikasi mengakses backend melalui `src/lib/api.ts`:

### Telemetry
- `GET /api/telemetry/latest` - Ambil data sensor terbaru
- `GET /api/telemetry/history` - Ambil history sensor (150 records)
- `GET /api/telemetry/stream` - SSE stream untuk realtime updates

### Irrigation
- `POST /api/irrigation/trigger` - Trigger penyiraman manual
- `POST /api/irrigation/stop` - Stop penyiraman
- `PUT /api/irrigation/settings` - Update pengaturan jadwal & threshold

### Logs
- `GET /api/logs` - Ambil log aplikasi

## 🛠️ Development Guidelines

### Adding New Features

1. **Create Feature Folder**
   ```bash
   mkdir -p src/features/nama-fitur
   ```

2. **Create Components & Logic**
   ```typescript
   // src/features/nama-fitur/NamaComponent.tsx
   // src/features/nama-fitur/validators.ts
   // src/features/nama-fitur/index.ts
   ```

3. **Export from Barrel**
   ```typescript
   // src/features/nama-fitur/index.ts
   export { NamaComponent } from './NamaComponent';
   export { validateNama } from './validators';
   ```

4. **Import in App**
   ```typescript
   import { NamaComponent } from './features/nama-fitur';
   ```

### Adding UI Components

1. **Create Component**
   ```typescript
   // src/components/ui/NamaComponent.tsx
   export const NamaComponent: React.FC<Props> = ({ ... }) => { ... };
   ```

2. **Export from Barrel**
   ```typescript
   // src/components/ui/index.ts
   export { NamaComponent } from './NamaComponent';
   ```

3. **Use Everywhere**
   ```typescript
   import { NamaComponent } from './components/ui';
   ```

## 📦 Dependencies

### Core
- **React 19** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **lucide-react** - Icons

### Key Libraries
- **Server-Sent Events (Native)** - Real-time data streaming
- **Web Audio API (Native)** - Audio feedback

## 🔒 Security Notes

- Passwords disimpan di localStorage (hanya untuk development)
- Untuk production, implementasikan proper authentication (JWT, OAuth, dll)
- Validate semua input di server-side
- Use HTTPS untuk production deployment
- Implement CORS jika frontend & backend di domain berbeda

## 📱 Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

UI secara otomatis menyesuaikan layout untuk setiap ukuran layar.

## 🐛 Troubleshooting

### Build Fails
```bash
# Clear cache dan reinstall
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

### API Connection Error
- Verify backend server berjalan
- Check `VITE_API_BASE_URL` di `.env`
- Check browser console untuk error messages
- Verify CORS configuration jika cross-origin

### SSE Connection Lost
- Aplikasi akan auto-reconnect dalam 3 detik
- Check network tab di DevTools
- Verify backend SSE endpoint tersedia

## 📚 Documentation

- [Architecture Guide](./ARCHITECTURE.md) - Detailed architecture explanation
- [Build Guide](./BUILD_GUIDE.md) - Build, deploy, dan troubleshooting
- [API Documentation](./docs/API.md) - API endpoints detail

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/nama-fitur`
2. Commit changes: `git commit -m 'Add nama-fitur'`
3. Push to branch: `git push origin feature/nama-fitur`
4. Open Pull Request

### Code Style
- Use TypeScript strict mode
- Follow existing naming conventions
- Keep components small and focused
- Add JSDoc comments untuk public functions
- Use barrel exports untuk clean imports

## 📝 Project Structure Best Practices

✅ **DO:**
- Keep App.tsx minimal (< 300 lines)
- Use feature-based organization
- Export from barrel (index.ts)
- Separate validation logic
- Centralize API calls

❌ **DON'T:**
- Mix features dalam satu folder
- Import with long relative paths
- Put business logic di components
- Duplicate utility functions
- Make App.tsx a container for everything

## 🎯 Roadmap

- [ ] Add historical data charts
- [ ] Implement automation rules
- [ ] Add email/SMS alerts
- [ ] Multi-device support
- [ ] Data export (CSV/JSON)
- [ ] Dark mode toggle
- [ ] Advanced scheduling (weekly)
- [ ] Weather API integration

## 📄 License

MIT License - lihat [LICENSE](./LICENSE) untuk detail.

## 👨‍💻 Author

**Moetrixs**
- GitHub: [@Moetrixs](https://github.com/Moetrixs)
- Email: moetrixs17@gmail.com

## 🙏 Acknowledgments

- Community React Developers
- Tailwind CSS Team
- Open Source Contributors

---

**Last Updated**: October 2026
**Version**: 2.0.0 (Refactored Architecture)
