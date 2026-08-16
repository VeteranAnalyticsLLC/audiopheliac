import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const raw = import.meta.env.BASE_URL || "/";
  const normalized = raw.replace(/^\.\//, "/").replace(/\/$/, "") || "/";
  const basepath = normalized === "/" ? undefined : normalized;
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    ...(basepath ? { basepath } : {}),
  });
}
