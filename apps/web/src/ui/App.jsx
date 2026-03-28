import AppMainContent from "./components/AppMainContent.jsx";
import AppShellLayout from "./components/AppShellLayout.jsx";
import useAppController from "./hooks/useAppController.js";
import { buildAppViewModel } from "./view-model/app-view-model.js";

export default function App() {
  const controller = useAppController();
  const viewModel = buildAppViewModel(controller);

  return (
    <AppShellLayout {...viewModel.shell}>
      <AppMainContent {...viewModel.mainContent} />
    </AppShellLayout>
  );
}
