import moduleAlias from "module-alias";
import { FOLDERS } from "./constants/index.js";
import { root } from "./root";

moduleAlias.addAliases({
	"#": __dirname,
	...FOLDERS.reduce(
		(folderAlias, folder) => Object.assign(folderAlias, { [`#${folder}`]: `${__dirname}/${folder}` }),
		{},
	),
});
moduleAlias();

// Set global base directory
(global as any).__baseDir = root;

const { startServer } = require("./server.js");
import type { Environment } from "./interfaces/IEnv.js";

startServer(<Environment>process.env.NODE_ENV);
