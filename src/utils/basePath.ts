export const BASE_PATH =
  process.env.NEXT_PUBLIC_BASE_PATH !== undefined
    ? process.env.NEXT_PUBLIC_BASE_PATH
    : '/space-edu-3d';

/**
 * Prepends basePath to relative asset paths if not already present.
 */
export function withBasePath(path: string): string {
  if (!path) return path;
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('//') ||
    path.startsWith('data:')
  ) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (BASE_PATH && (cleanPath === BASE_PATH || cleanPath.startsWith(`${BASE_PATH}/`))) {
    return cleanPath;
  }
  return `${BASE_PATH}${cleanPath}`;
}
