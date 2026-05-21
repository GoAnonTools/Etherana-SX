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
    screenshots: [
      {
        src: '/screenshots/p1.png',
        form_factor: 'wide',
        sizes: '2560x1600',
      },
      {
        src: '/screenshots/p2.png',
        form_factor: 'wide',
        sizes: '2560x1600',
      },
      {
        src: '/screenshots/p1_small.png',
        form_factor: 'narrow',
        sizes: '828x1792',
      },
      {
        src: '/screenshots/p2_small.png',
        form_factor: 'narrow',
        sizes: '828x1792',
      },
    ],
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
