import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'Craft Brew',
		short_name: 'Craft Brew',
		description: 'Homebrew fridge monitor and logs.',
		start_url: '/',
		display: 'standalone',
		background_color: '#0f1113',
		theme_color: '#0f1113',
		icons: [
			{
				src: '/icons/icon.png',
				sizes: 'any',
				type: 'image/png',
			},
			{
				src: '/icons/icon.png',
				sizes: 'any',
				type: 'image/png',
				purpose: 'maskable',
			},
		],
	};
}
