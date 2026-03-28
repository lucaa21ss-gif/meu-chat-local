/**
 * Navigation Route Descriptor Contract
 *
 * Defines the frozen structure and validation schema for route definitions,
 * ensuring consistency across path, view, and descriptor mappings.
 */

import { ROUTE_DEFINITIONS, ROUTE_PATHS, ROUTE_VIEWS } from "./navigation.js";

/**
 * Route definition shape contract
 * Documents required properties for each route in ROUTE_DEFINITIONS
 * @type {Readonly<{id: string, path: string, view: string, label: string, showInSidebar: boolean, end?: boolean}>}
 */
export const ROUTE_DEFINITION_SHAPE = Object.freeze({
  id: "string",
  path: "string",
  view: "string",
  label: "string",
  showInSidebar: "boolean",
  end: "boolean (optional)",
});

/**
 * Derived sorted array of all route IDs from ROUTE_DEFINITIONS
 * Automatically maintains sync with ROUTE_DEFINITIONS changes
 * @type {ReadonlyArray<string>}
 */
export const ROUTE_ID_KEYS = Object.freeze(
  ROUTE_DEFINITIONS.map((route) => route.id).sort()
);

/**
 * Derived sorted array of all path keys from ROUTE_PATHS
 * Automatically maintains sync with ROUTE_PATHS changes
 * @type {ReadonlyArray<string>}
 */
export const ROUTE_PATH_KEYS = Object.freeze(
  Object.keys(ROUTE_PATHS).sort()
);

/**
 * Derived sorted array of all view values from ROUTE_VIEWS
 * Automatically maintains sync with ROUTE_VIEWS changes
 * @type {ReadonlyArray<string>}
 */
export const ROUTE_VIEW_VALUES = Object.freeze(
  Object.values(ROUTE_VIEWS).sort()
);

/**
 * Map of route ID to route definition for quick lookup
 * Derived from ROUTE_DEFINITIONS for efficient access
 * @type {Readonly<Record<string, any>>}
 */
export const ROUTE_DEFINITION_MAP = Object.freeze(
  ROUTE_DEFINITIONS.reduce((map, route) => {
    map[route.id] = route;
    return map;
  }, {})
);

/**
 * Validation helper to check if all route definitions have required shape properties
 * @param {any} routeDefinition - A route definition object to validate
 * @returns {string[]} Array of missing/invalid properties, empty if valid
 */
export function validateRouteDefinitionShape(routeDefinition) {
  const errors = [];
  const requiredFields = ["id", "path", "view", "label", "showInSidebar"];

  for (const field of requiredFields) {
    if (!(field in routeDefinition)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (typeof routeDefinition.id !== "string" || routeDefinition.id.length === 0) {
    errors.push("id must be non-empty string");
  }
  if (typeof routeDefinition.path !== "string" || routeDefinition.path.length === 0) {
    errors.push("path must be non-empty string");
  }
  if (typeof routeDefinition.view !== "string" || routeDefinition.view.length === 0) {
    errors.push("view must be non-empty string");
  }
  if (typeof routeDefinition.label !== "string" || routeDefinition.label.length === 0) {
    errors.push("label must be non-empty string");
  }
  if (typeof routeDefinition.showInSidebar !== "boolean") {
    errors.push("showInSidebar must be boolean");
  }

  return errors;
}
