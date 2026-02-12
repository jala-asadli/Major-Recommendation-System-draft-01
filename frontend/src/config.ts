const rawApiBase = String(import.meta.env.VITE_API_BASE ?? '').trim();
const apiBase =
  !rawApiBase || rawApiBase === 'undefined' || rawApiBase === 'null' ? '' : rawApiBase.replace(/\/+$/, '');
const isDev = import.meta.env.DEV;

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // In dev, always use Vite proxy (/api -> backend) to avoid localhost/127.0.0.1 host mismatch.
  if (isDev) {
    return normalizedPath;
  }
  return apiBase ? `${apiBase}${normalizedPath}` : normalizedPath;
};
