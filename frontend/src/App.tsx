import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Landing from './sections/landingSections/landingPage';
import Auth from './sections/authentication/Auth';
import { CartProvider } from './sections/landingSections/cartContents/cartContext';

import UserDashboard from './sections/user/userDashboard';
import AdminDashboard from './sections/admin/adminDashboard';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import SessionExpiredModal from './sections/modals/SessionExpiredModal';

function SessionExpiredModalBridge() {
  const { showSessionExpiredModal, resolveSessionExpired } = useAuth();
  return (
    <SessionExpiredModal
      isOpen={showSessionExpiredModal}
      onStayLoggedIn={() => resolveSessionExpired(true)}
      onLogOut={() => resolveSessionExpired(false)}
    />
  );
}

const App: React.FC = () => {
  return (
    <CartProvider>
      <BrowserRouter>
        <AuthProvider>
          <SessionExpiredModalBridge />
          <Routes>

            {/* Landing Page */}
            <Route path='/' element={<Landing />} />

            {/* Authintication */}
            <Route path='/auth' element={<Auth />} />

            {/* Dashboards */}
            <Route path='/user' element={<UserDashboard />} />
            <Route path='/admin' element={<AdminDashboard />} />

          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </CartProvider>
  );
};

export default App;