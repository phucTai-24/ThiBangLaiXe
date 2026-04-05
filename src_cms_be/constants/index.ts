export enum Language {
	vi = "vi",
	en = "en",
}

export const DEFAULTS = {
	DEFAULT_ERROR_CODE: -999,
	DEFAULT_ERROR_MESSAGE: "Đã có lỗi xảy ra, vui lòng thử lại sau",
	DEFAULT_ERROR_MESSAGE_EN: "There has been a problem with the system, please try again later",
	DEFAULT_SUCCESS_MESSAGE: "Thành công",
	DEFAULT_SUCCESS_MESSAGE_EN: "Success",
};

export const LOG = {
	LOG_CHANNEL_TYPE: "centerAPI",
	LOG_TYPE: "log",
	LOG_INFO_CATEGORY: "info",
	LOG_ERROR_CATEGORY: "error",
	LOG_TRANS_CATEGORY: "trans",
	LOG_TRACE_CATEGORY: "trace",
	LOG_DB_CATEGORY: "db",
};

export const PATHS = {
	BUILD_PATH: "dist",
	LOG_PATH: "logs",
	STORE_PATH: "storage",
};

export const FOLDERS = [
	"config",
	"controllers",
	"dto",
	"interfaces",
	"middlewares",
	"models",
	"providers",
	"services",
	"templates",
];

export const ERROR = {
	ERROR_TYPE: {
		API: "API",
		DB: "DB",
	},
	ErrorConfiguration: {
		API: {
			[-999]: "There seems to be a problem performing your action, please try again.",
			[104]: "The voucher transaction is not found.",
			[401]: "Unauthorize",
			[400]: "Validation Error",
			[302]: "Cập nhật tài khoản",
		},
		DB: {
			[410]: "Page must be larger or equal to 0",
			[411]: "PageSize must be a positive number",
		},
	},
};

export const MIME = {
	MIME_TYPES: {
		IMAGE: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp", "image/tiff"],
		VIDEO: [
			"video/x-flv",
			"video/mp4",
			"application/x-mpegURL",
			"video/MP2T",
			"video/3gpp",
			"video/quicktime",
			"video/x-msvideo",
			"video/x-ms-wmv",
			"video/webm",
			"video/ogg",
		],
		DOCUMENT: [
			"application/pdf",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/vnd.ms-excel",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"application/vnd.ms-powerpoint",
			"application/vnd.openxmlformats-officedocument.presentationml.presentation",
			"text/csv",
		],
		TEXT: ["text/plain", "text/html", "text/css", "text/javascript", "application/json", "application/xml", "text/xml"],
		AUDIO: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm"],
		ARCHIVE: [
			"application/zip",
			"application/x-rar-compressed",
			"application/x-7z-compressed",
			"application/gzip",
			"application/x-tar",
		],
	},
};

export const SWAGGER = { SWAGGER_ROUTER: "/swagger/index", SWAGGER_OUTPUT: "/swagger/swagger-output.json" };

export default {
	FOLDERS,
	...DEFAULTS,
	...LOG,
	...PATHS,
	...SWAGGER,
	...MIME,
	...ERROR,
};
