import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Landing from './sections/landingpage';
import Auth from './sections/Auth';
import UserDashboard from './sections/user/userDashboard';
import AdminDashboard from './sections/admin/Admindashboard';



const App: React.FC = () => {
  return (
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
  );
};

export default App;