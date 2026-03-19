export function createServiceDepsForApp({
  core,
  runtime,
  parsers,
  features,
}) {
  return {
    ...core,
    ...runtime,
    parsers,
    ...features,
  };
}