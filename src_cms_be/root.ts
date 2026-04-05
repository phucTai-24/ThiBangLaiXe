import { resolve } from "path";
import { config } from "dotenv";

// Load environment variables from .env file
config();

const root = resolve(__dirname, "../");
const configPath = resolve(root, ".env");

export { root, configPath };
