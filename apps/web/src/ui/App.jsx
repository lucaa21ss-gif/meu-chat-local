import AppMainContent from "./components/AppMainContent.jsx";
import AppShellLayout from "./components/AppShellLayout.jsx";
import useAppController from "./hooks/useAppController.js";
import { buildAppViewModel } from "./view-model/app-view-model.js";

/**
 * App Component: Wiring Model from Controller → ViewModel → Layout Components
 *
 * Architecture Layers (validated by contracts):
 * ───────────────────────────────────────────
 * 1. CONTROLLER (useAppController hook)
 *    Shape: { menuOpen, openMenu, closeMenu, backdropClassName, status, fetchJson, showStatus }
 *    Keys: APP_CONTROLLER_MODEL_KEYS (from contracts/index.js)
 *    Responsibility: Aggregate layout state + UI handlers into unified model
 *
 * 2. VIEW-MODEL (buildAppViewModel function)
 *    Transform: controller → { shell: {...}, mainContent: {...} }
 *    Shell props: { menuOpen, backdropClassName, onCloseMenu, onOpenMenu }
 *      Keys: APP_SHELL_PROP_KEYS (from contracts/index.js)
 *      Mapped: controller keys → component parameter names (e.g., closeMenu → onCloseMenu)
 *    MainContent props: { status, fetchJson, showStatus }
 *      Keys: APP_MAIN_CONTENT_PROP_KEYS (from contracts/index.js)
 *      Mapped: 1:1 passthrough
 *    Responsibility: Map controller model to component props with explicit renaming
 *
 * 3. LAYOUT COMPONENTS (AppShellLayout + AppMainContent)
 *    AppShellLayout expects: menuOpen, backdropClassName, onCloseMenu, onOpenMenu
 *    AppMainContent expects: status, fetchJson, showStatus
 *    Responsibility: Render UI based on prop contracts
 *
 * Contract Verification:
 * - See tests/app-unified-composition.test.js for end-to-end validation
 * - See tests/app-composition-contract.test.js for layer compatibility
 * - See tests/app-controller.test.js for controller ↔ view-model alignment
 */
export default function App() {
  // Layer 1: Build unified model from hooks (layout state + UI handlers)
  const controller = useAppController();

  // Layer 2: Transform model to component props via declared mappings
  const viewModel = buildAppViewModel(controller);

  // Layer 3: Render layout with mapped props
  return (
    <AppShellLayout {...viewModel.shell}>
      <AppMainContent {...viewModel.mainContent} />
    </AppShellLayout>
  );
}
