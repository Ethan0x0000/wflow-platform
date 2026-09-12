import { agentRoutes } from "./agent.js";
import { formRoutes } from "./form.js";
import { handoverRoutes } from "./handover.js";
import { instRoutes } from "./inst.js";
import { manageRoutes } from "./manage.js";
import { miscRoutes } from "./misc.js";
import { modelRoutes } from "./model.js";
import { notifyRoutes } from "./notify.js";
import { orgRoutes } from "./org.js";
import { resRoutes } from "./res.js";
import { startupRoutes } from "./startup.js";
import { taskRoutes } from "./task.js";
import type { RouteModule } from "./shared.js";

/** Domain routers are tried in order; a router returns NOT_HANDLED to fall through. */
export const routeModules: RouteModule[] = [
  miscRoutes, formRoutes, resRoutes, agentRoutes, handoverRoutes, manageRoutes,
  orgRoutes, modelRoutes, startupRoutes, instRoutes, taskRoutes, notifyRoutes,
];
