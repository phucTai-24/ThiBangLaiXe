import { initModels } from "../../../models/init-models";
import sequelize from "./service";
const initExport = initModels(sequelize);

export default initExport;
