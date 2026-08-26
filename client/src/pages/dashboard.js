import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import logo from '../assets/Red_Beige_Minimal_Simple_Typographic_Chic_Logo-removebg-preview.png';
function Dashboard() {
  const [activeItem, setActiveItem] = useState('Dashboard');

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar activeItem={activeItem} onItemSelect={setActiveItem} />

      <main className="flex-1 p-8 lg:p-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-medium text-gray-400">RFQ Portal</p>
          <h1 className="mt-1 text-3xl font-semibold text-gray-800">{activeItem}</h1>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
