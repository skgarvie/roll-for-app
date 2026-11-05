import {
  createAppleSplashScreens,
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config';

// Generates favicon, PWA icons (incl. maskable), apple-touch-icon and iPad
// splash screens from a single SVG at build time.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#1c1917' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#1c1917' } },
    appleSplashScreens: createAppleSplashScreens(
      {
        padding: 0.4,
        // We only ship one (dark) splash variant. Without a custom name the
        // generator adds a "light-" suffix to the <link> tags but not to the files.
        name: (landscape, size) =>
          `apple-splash-${landscape ? 'landscape' : 'portrait'}-${size.width}x${size.height}.png`,
        resizeOptions: { background: '#1c1917', fit: 'contain' },
        linkMediaOptions: { log: false, addMediaScreen: true, xhtml: false },
      },
      [
        'iPad mini 8.3"',
        'iPad 10.2"',
        'iPad 11"',
        'iPad Air 10.9"',
        'iPad Air 11"',
        'iPad Air 13"',
        'iPad Pro 11"',
        'iPad Pro 12.9"',
      ],
    ),
  },
  images: ['public/logo.svg'],
});
