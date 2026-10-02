/** Sous-dossier du site (ex. "/Kebab-simulator" sur GitHub Pages), "" sinon. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** URL absolue d'une page du site, pour les liens partagés et les redirections OAuth. */
export function absoluteUrl(path: string) {
  return `${window.location.origin}${BASE_PATH}${path}`;
}

export const leagueHref = (id: string) => `/leagues/view/?id=${encodeURIComponent(id)}`;
export const joinHref = (code: string) => `/join/?code=${encodeURIComponent(code)}`;
