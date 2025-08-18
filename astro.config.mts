import db from '@astrojs/db';
import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	integrations: [db()],
	output: 'server',
	adapter: node({
		mode: 'standalone',
	}),
});
