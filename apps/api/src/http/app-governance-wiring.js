export function createGovernanceDepsForApp({
  core,
  services,
  builders,
}) {
  return {
    ...core,
    ...services,
    ...builders,
  };
}