import { Route, Routes } from "react-router-dom";

import { Shell } from "./components/Shell";
import { Budgets } from "./pages/Budgets";
import { Cards } from "./pages/Cards";
import { Overview } from "./pages/Overview";
import { Receipts } from "./pages/Receipts";
import { Transactions } from "./pages/Transactions";

export function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/cards" element={<Cards />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="*" element={<Overview />} />
      </Routes>
    </Shell>
  );
}
