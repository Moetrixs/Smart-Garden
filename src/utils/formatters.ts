export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '--:--:--';
  }
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return `${date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  } catch {
    return '--';
  }
}

export function formatUptime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}j ${mins}m ${secs}d`;
  if (mins > 0) return `${mins}m ${secs}d`;
  return `${secs}d`;
}

export function getSoilMoistureStatus(val: number): { label: string; tone: 'danger' | 'warning' | 'optimal' | 'high'; desc: string } {
  if (val < 25) {
    return { label: 'Kering Kritis', tone: 'danger', desc: 'Tanaman butuh penyiraman segera' };
  }
  if (val < 40) {
    return { label: 'Cukup Rendah', tone: 'warning', desc: 'Mendekati batas penyiraman' };
  }
  if (val <= 70) {
    return { label: 'Kelembaban Optimal', tone: 'optimal', desc: 'Kondisi akar ideal untuk serapan nutrisi' };
  }
  return { label: 'Terlalu Basah / Jenuh', tone: 'high', desc: 'Risiko pembusukan akar bila tergenang' };
}

export function getAirTempStatus(val: number): { label: string; tone: 'cool' | 'optimal' | 'warm' | 'hot' } {
  if (val < 20) return { label: 'Dingin', tone: 'cool' };
  if (val <= 29) return { label: 'Nyaman', tone: 'optimal' };
  if (val <= 33) return { label: 'Hangat', tone: 'warm' };
  return { label: 'Suhu Panas', tone: 'hot' };
}

export function getLightStatus(lux: number): { label: string; desc: string } {
  if (lux < 50) return { label: 'Gelap / Malam', desc: 'Cahaya minim' };
  if (lux < 300) return { label: 'Redup / Ruangan', desc: 'Pencahayaan dalam ruang' };
  if (lux < 800) return { label: 'Terang / Parsial', desc: 'Pencahayaan siang optimal' };
  return { label: 'Terik / Langsung', desc: 'Sinar matahari intens' };
}
