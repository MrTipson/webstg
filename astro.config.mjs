import { defineConfig } from 'astro/config';
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
	integrations: [
		react(),
		mdx(),
		tailwind({
			applyBaseStyles: false,
		})
	],
	site: 'https://mrtipson.github.io',
	base: '/webstg',
});