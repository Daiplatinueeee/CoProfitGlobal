import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Landing from './sections/landingSections/landingPage';
import Auth from './sections/authentication/Auth';
import { CartProvider } from './sections/landingSections/cartContents/cartContext';

import UserDashboard from './sections/user/userDashboard';
import AdminDashboard from './sections/admin/adminDashboard';

const App: React.FC = () => {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>

          {/* Landing Page */}
          <Route path='/' element={<Landing />} />

          {/* Authintication */}
          <Route path='/auth' element={<Auth />} />

          {/* Dashboards */}
          <Route path='/user' element={<UserDashboard />} />
          <Route path='/admin' element={<AdminDashboard />} />

        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
};

export default App;