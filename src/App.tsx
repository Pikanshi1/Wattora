
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import Solar from './pages/Solar'
import Energy from './pages/Energy'
import Optimization from './pages/Optimization'
import Devices from './pages/Devices'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Sites from './pages/Sites'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/solar" element={<Solar />} />
      <Route path="/energy" element={<Energy />} />
      <Route path="/optimization" element={<Optimization />} />
      <Route path="/devices" element={<Devices />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/sites" element={<Sites />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
