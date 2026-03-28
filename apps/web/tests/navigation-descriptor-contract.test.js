import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ROUTE_DEFINITION_SHAPE,
  ROUTE_ID_KEYS,
  ROUTE_PATH_KEYS,
  ROUTE_VIEW_VALUES,
  ROUTE_DEFINITION_MAP,
  validateRouteDefinitionShape,
} from "../src/ui/routes/navigation-descriptor-contract.js";
import { ROUTE_DEFINITIONS, ROUTE_PATHS, ROUTE_VIEWS } from "../src/ui/routes/navigation.js";

describe("navigation-descriptor-contract", () => {
  it("should have ROUTE_DEFINITION_SHAPE frozen", () => {
    assert.equal(Object.isFrozen(ROUTE_DEFINITION_SHAPE), true);
  });

  it("should have ROUTE_ID_KEYS frozen and sorted", () => {
    assert.equal(Object.isFrozen(ROUTE_ID_KEYS), true);
    const expectedKeys = ROUTE_DEFINITIONS.map((r) => r.id).sort();
    assert.deepEqual(ROUTE_ID_KEYS, expectedKeys);
  });

  it("should have ROUTE_PATH_KEYS frozen and sorted", () => {
    assert.equal(Object.isFrozen(ROUTE_PATH_KEYS), true);
    const expectedKeys = Object.keys(ROUTE_PATHS).sort();
    assert.deepEqual(ROUTE_PATH_KEYS, expectedKeys);
  });

  it("should have ROUTE_VIEW_VALUES frozen and sorted", () => {
    assert.equal(Object.isFrozen(ROUTE_VIEW_VALUES), true);
    const expectedValues = Object.values(ROUTE_VIEWS).sort();
    assert.deepEqual(ROUTE_VIEW_VALUES, expectedValues);
  });

  it("should have ROUTE_DEFINITION_MAP frozen", () => {
    assert.equal(Object.isFrozen(ROUTE_DEFINITION_MAP), true);
  });

  describe("route definition map completeness", () => {
    it("should contain entry for each route definition", () => {
      for (const route of ROUTE_DEFINITIONS) {
        assert.strictEqual(
          route.id in ROUTE_DEFINITION_MAP,
          true,
          `Missing map entry for route ID: ${route.id}`
        );
        assert.deepEqual(ROUTE_DEFINITION_MAP[route.id], route);
      }
    });

    it("should have same keys as ROUTE_ID_KEYS", () => {
      const mapKeys = Object.keys(ROUTE_DEFINITION_MAP).sort();
      assert.deepEqual(mapKeys, ROUTE_ID_KEYS);
    });
  });

  describe("path-to-definition alignment", () => {
    it("all routes have paths that exist in ROUTE_PATHS values", () => {
      const pathValues = new Set(Object.values(ROUTE_PATHS));

      for (const route of ROUTE_DEFINITIONS) {
        assert.equal(
          pathValues.has(route.path),
          true,
          `Route path not in ROUTE_PATHS: ${route.path}`
        );
      }
    });

    it("all unique paths in ROUTE_PATHS are used by at least one route", () => {
      const usedPaths = new Set(ROUTE_DEFINITIONS.map((r) => r.path));
      const routePaths = Object.values(ROUTE_PATHS);

      for (const path of routePaths) {
        assert.equal(
          usedPaths.has(path),
          true,
          `Path in ROUTE_PATHS not used by any route: ${path}`
        );
      }
    });
  });

  describe("view-to-definition alignment", () => {
    it("all routes have views that exist in ROUTE_VIEWS values", () => {
      const viewValues = new Set(Object.values(ROUTE_VIEWS));

      for (const route of ROUTE_DEFINITIONS) {
        assert.equal(
          viewValues.has(route.view),
          true,
          `Route view not in ROUTE_VIEWS: ${route.view}`
        );
      }
    });

    it("all unique views in ROUTE_VIEWS are used by at least one route", () => {
      const usedViews = new Set(ROUTE_DEFINITIONS.map((r) => r.view));
      const routeViews = Object.values(ROUTE_VIEWS);

      for (const view of routeViews) {
        assert.equal(
          usedViews.has(view),
          true,
          `View in ROUTE_VIEWS not used by any route: ${view}`
        );
      }
    });
  });

  describe("route id uniqueness", () => {
    it("should have no duplicate route IDs", () => {
      const ids = ROUTE_DEFINITIONS.map((r) => r.id);
      const uniqueIds = new Set(ids);
      assert.equal(uniqueIds.size, ids.length);
    });

    it("should have no duplicate paths except for chat alias", () => {
      const paths = ROUTE_DEFINITIONS.map((r) => r.path);
      const pathCount = {};

      for (const path of paths) {
        pathCount[path] = (pathCount[path] || 0) + 1;
      }

      // Chat should appear twice (chat and chatAlias)
      const duplicatePaths = Object.entries(pathCount)
        .filter(([path, count]) => count > 1 && path !== "/")
        .map(([path]) => path);

      assert.deepEqual(duplicatePaths, []);
    });
  });

  describe("validateRouteDefinitionShape", () => {
    it("should return empty array for valid route definition", () => {
      const validRoute = {
        id: "test",
        path: "/test",
        view: "test",
        label: "Test",
        showInSidebar: true,
      };

      const errors = validateRouteDefinitionShape(validRoute);
      assert.deepEqual(errors, []);
    });

    it("should detect missing required fields", () => {
      const incompleteRoute = {
        id: "test",
        path: "/test",
        // missing view, label, showInSidebar
      };

      const errors = validateRouteDefinitionShape(incompleteRoute);
      assert.equal(errors.length > 0, true);
      assert.equal(errors.some((e) => e.includes("view")), true);
      assert.equal(errors.some((e) => e.includes("label")), true);
      assert.equal(errors.some((e) => e.includes("showInSidebar")), true);
    });

    it("should detect invalid id (empty string)", () => {
      const invalidRoute = {
        id: "",
        path: "/test",
        view: "test",
        label: "Test",
        showInSidebar: true,
      };

      const errors = validateRouteDefinitionShape(invalidRoute);
      assert.equal(errors.some((e) => e.includes("id")), true);
    });

    it("should detect invalid path (empty string)", () => {
      const invalidRoute = {
        id: "test",
        path: "",
        view: "test",
        label: "Test",
        showInSidebar: true,
      };

      const errors = validateRouteDefinitionShape(invalidRoute);
      assert.equal(errors.some((e) => e.includes("path")), true);
    });

    it("should detect invalid showInSidebar (not boolean)", () => {
      const invalidRoute = {
        id: "test",
        path: "/test",
        view: "test",
        label: "Test",
        showInSidebar: "true", // string instead of boolean
      };

      const errors = validateRouteDefinitionShape(invalidRoute);
      assert.equal(errors.some((e) => e.includes("showInSidebar")), true);
    });

    it("should validate all ROUTE_DEFINITIONS with no errors", () => {
      for (const route of ROUTE_DEFINITIONS) {
        const errors = validateRouteDefinitionShape(route);
        assert.deepEqual(errors, [], `Route ${route.id} has validation errors: ${errors.join(", ")}`);
      }
    });
  });

  describe("cross-contract alignment", () => {
    it("ROUTE_ID_KEYS length should equal ROUTE_DEFINITION_MAP length", () => {
      assert.equal(ROUTE_ID_KEYS.length, Object.keys(ROUTE_DEFINITION_MAP).length);
    });

    it("ROUTE_PATH_KEYS should match ROUTE_PATHS object keys", () => {
      const pathKeys = Object.keys(ROUTE_PATHS).sort();
      assert.deepEqual(ROUTE_PATH_KEYS, pathKeys);
    });

    it("ROUTE_VIEW_VALUES should match ROUTE_VIEWS object values", () => {
      const viewValues = Object.values(ROUTE_VIEWS).sort();
      assert.deepEqual(ROUTE_VIEW_VALUES, viewValues);
    });
  });
});
