import { z, defineCollection } from 'astro:content';

export const collections = {
	'docs': defineCollection({
		type: 'content',
		schema: z.object({
			title: z.string(),
			description: z.string(),
			draft: z.boolean(),
		}),
	}),
	'examples': defineCollection({
		type: 'data',
		schema: z.object({
			name: z.string(),
			code: z.string(),
		}),
	}),
};