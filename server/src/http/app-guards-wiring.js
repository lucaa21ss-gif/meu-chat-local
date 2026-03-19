export function createGuardsAndAuditDepsForApp({
  core,
  services,
  parsers,
}) {
  return {
    ...core,
    ...services,
    ...parsers,
  };
}