import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Etherana SX - Direct Your Curiosity',
    short_name: 'Etherana SX',
    description: 'Etherana SX is an AI powered answering engine.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    screenshots: [],
    icons: [
      {
        src: '/Etherana_SX_logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
