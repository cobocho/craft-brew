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
				src: '/icons/app-icon.svg',
				sizes: 'any',
				type: 'image/svg+xml',
			},
			{
				src: '/icons/maskable-icon.svg',
				sizes: 'any',
				type: 'image/svg+xml',
				purpose: 'maskable',
			},
		],
	};
}
