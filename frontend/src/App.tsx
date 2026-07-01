import { Route, Routes } from "react-router-dom";
import { UsersPage } from "./pages/UsersPage";
import { TeamGeneratorPage } from "./pages/TeamGeneratorPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<UsersPage />} />
      <Route path="/team-generate" element={<TeamGeneratorPage />} />
    </Routes>
  );
}
