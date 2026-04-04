module.exports = {
	// Fetch queries
	filters: {
		name: "filters",
		in: "query",
		description: "filter, visit https://www.npmjs.com/package/sequelize-api-paginate for syntax",
		schema: {
			type: "string",
		},
	},
	sortField: {
		name: "sortField",
		in: "query",
		description: "sortField, visit https://www.npmjs.com/package/sequelize-api-paginate for syntax",
		schema: {
			type: "string",
		},
	},
	sortOrder: {
		name: "sortOrder",
		in: "query",
		description: "sort order, visit https://www.npmjs.com/package/sequelize-api-paginate for syntax",
		schema: {
			type: "string",
			enum: ["asc", "desc"],
		},
	},
	page: {
		name: "page",
		in: "query",
		description: "page, visit https://www.npmjs.com/package/sequelize-api-paginate for syntax",
		schema: {
			type: "integer",
			minimum: 1,
		},
	},
	pageSize: {
		name: "pageSize",
		in: "query",
		description: "pageSize, visit https://www.npmjs.com/package/sequelize-api-paginate for syntax",
		schema: {
			type: "integer",
			minimum: 1,
		},
	},
	// Mutate queries
	filtersMutate: {
		name: "filters",
		in: "query",
		description: "filter, visit https://www.npmjs.com/package/sequelize-api-paginate for syntax",
		schema: {
			type: "string",
		},
		required: true,
	},
};
