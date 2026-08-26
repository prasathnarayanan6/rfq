import './App.css';
import Login from './Login';
import Dashboard from './pages/dashboard';
import { BrowserRouter, Route, Routes } from "react-router-dom";
import VendorList from './pages/VendorList';
import DashboardLayout from './components/DashboardLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vendor-list" element={<VendorList />} />
          <Route path="/settings" element={<Dashboard />} />
          <Route path="/purchase-requests" element={<Dashboard />} />
          <Route path="/reports" element={<Dashboard />} />
          <Route path="/quotation" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
