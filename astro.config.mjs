import { defineConfig } from 'astro/config';
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import tailwind from "@astrojs/tailwind";
import AutoImport from 'astro-auto-import';
import MDXCodeBlocks, { mdxCodeBlockAutoImport } from 'astro-mdx-code-blocks';

// https://astro.build/config
export default defineConfig({
	integrations: [
		react(),
		AutoImport({
			imports: [
				mdxCodeBlockAutoImport('@/components/CodeBlock.astro'),
				'@/components/CodeBlock.astro',
				{
					'@/components/MdMachine.tsx': ['MdMachine']
				}
			],
		}),
		MDXCodeBlocks(),
		mdx(),
		tailwind({
			applyBaseStyles: false,
		})
	],
	site: 'https://mrtipson.github.io',
	base: '/webstg',
});