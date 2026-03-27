import { buildRegisterAppRoutesDeps } from "./app-route-deps.js";

export function createRouteDepsForApp({
  core,
  registrars,
  guards,
  runtime,
  services,
  parsers,
  features,
}) {
  return buildRegisterAppRoutesDeps({
    ...core,
    ...registrars,
    ...guards,
    ...runtime,
    ...services,
    ...parsers,
    ...features,
  });
}
