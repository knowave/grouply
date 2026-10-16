import { Route, Routes } from "react-router-dom";
import { UsersPage } from "./pages/UsersPage";
import { TeamGeneratorPage } from "./pages/TeamGeneratorPage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { RestaurantsPage } from "./pages/RestaurantsPage";
import { NoticeListPage } from "./pages/NoticeListPage";
import { NoticeNewPage } from "./pages/NoticeNewPage";
import { NoticeDetailPage } from "./pages/NoticeDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<UsersPage />} />
      <Route path="/team-generate" element={<TeamGeneratorPage />} />
      <Route path="/departments" element={<DepartmentsPage />} />
      <Route path="/restaurants" element={<RestaurantsPage />} />
      <Route path="/notices" element={<NoticeListPage />} />
      <Route path="/notices/new" element={<NoticeNewPage />} />
      <Route path="/notices/:id" element={<NoticeDetailPage />} />
    </Routes>
  );
}
