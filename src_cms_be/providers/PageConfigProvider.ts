import { BaseProvider } from "#templates/base/provider";
import { PageConfig } from "#models/PageConfig";

export class PageConfigProvider extends BaseProvider<PageConfig> {
	public static instance: PageConfigProvider;

	public static getInstance(): PageConfigProvider {
		PageConfigProvider.instance ??= new PageConfigProvider();
		return PageConfigProvider.instance;
	}

	public static get model() {
		return PageConfig;
	}

	constructor() {
		super("PageConfig");
	}

	async getHierarchical(options: { id?: string; staticLink?: string; code?: string }): Promise<any> {
		// Get the target page config by id, static_link, or code
		let targetPageConfig: any;

		if (options.id) {
			targetPageConfig = await this.getOne({
				where: { id: options.id },
				raw: true,
			});
		} else if (options.staticLink) {
			targetPageConfig = await this.getOne({
				where: { static_link: options.staticLink },
				raw: true,
			});
		} else if (options.code) {
			targetPageConfig = await this.getOne({
				where: { code: options.code },
				raw: true,
			});
		} else {
			// If no parameters provided, get the root item (parent_id = null, sort_order = 1)
			targetPageConfig = await this.getOne({
				where: { parent_id: null, sort_order: 1 },
				raw: true,
			});
		}

		if (!targetPageConfig) {
			throw new Error("Page config not found");
		}

		// Get all page configs to build hierarchy
		const allPageConfigs = await this.findAll({
			order: [
				["level", "ASC"],
				["sort_order", "ASC"],
				["name", "ASC"],
			],
		});

		// Build hierarchical structure
		return this.buildHierarchy(targetPageConfig, allPageConfigs);
	}

	async getHierarchicalByStaticLink(staticLink: string): Promise<any> {
		return this.getHierarchical({ staticLink });
	}

	private buildHierarchy(targetPageConfig: any, allPageConfigs: PageConfig[]): any {
		// Create a map for quick lookup
		const pageMap = new Map<string, any>();

		// Convert all pages to plain objects and store in map
		allPageConfigs.forEach((page) => {
			const pageData = page.toJSON ? page.toJSON() : page;
			pageMap.set(pageData.id, {
				id: pageData.id,
				name: pageData.name,
				code: pageData.code,
				static_link: pageData.static_link,
				static_link_en: pageData.static_link_en,
				is_article: pageData.is_article,
				level: pageData.level,
				sort_order: pageData.sort_order,
				parent_id: pageData.parent_id,
				children: [],
			});
		});

		// Build parent-child relationships
		pageMap.forEach((page) => {
			if (page.parent_id) {
				const parent = pageMap.get(page.parent_id);
				if (parent) {
					parent.children.push(page);
				}
			}
		});

		// Sort children by sort_order and name
		pageMap.forEach((page) => {
			if (page.children && page.children.length > 0) {
				page.children.sort((a: any, b: any) => {
					// Sort by sort_order first (null values go last)
					if (a.sort_order !== null && b.sort_order !== null) {
						if (a.sort_order !== b.sort_order) {
							return a.sort_order - b.sort_order;
						}
					} else if (a.sort_order !== null) {
						return -1;
					} else if (b.sort_order !== null) {
						return 1;
					}
					// Then by name
					return (a.name || "").localeCompare(b.name || "");
				});
			}
		});

		// Return the target page with its hierarchy
		const result = pageMap.get(targetPageConfig.id);
		if (result) {
			// Remove parent_id from the final result as it's not needed in the response
			delete result.parent_id;
			// Recursively remove parent_id from children
			this.removeParentIds(result);
		}

		return result;
	}

	private removeParentIds(node: any): void {
		if (node.children && node.children.length > 0) {
			node.children.forEach((child: any) => {
				delete child.parent_id;
				this.removeParentIds(child);
			});
		}
	}
}
