export function createRouteDeps(ctx, propNames) {
  return Object.fromEntries(
    propNames.map(name => [name, ctx[name]])
  );
}
