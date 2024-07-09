export type SubDirectory = { items: SidebarEntry[], collapsed?: boolean }
export type Link = { link: string }
export type Post = { slug: string }
export type SidebarEntry = { label: string } & (SubDirectory | Link | Post)

export const sidebar: SidebarEntry[] = [
	{
		label: 'My markdown files',
		items: [
			{ label: 'Markdown test', slug: 'markdown' },
			{ label: 'Other file', slug: 'other' },
		]
	},
	{ label: 'WebSTG sandbox', link: '/webstg/live' },
]