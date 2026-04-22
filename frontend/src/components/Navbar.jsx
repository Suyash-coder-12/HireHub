import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, loginWithGoogle, logout } = useAuth();
  const location = useLocation();

  return (
    <nav className="bg-white/90 backdrop-blur-sm border-b border-gray-100 fixed w-full top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Sleek Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-black text-white rounded-md flex items-center justify-center font-bold font-mono transition-transform group-hover:scale-105">
            H.
          </div>
          <span className="text-lg font-bold tracking-tight text-black">HireHub</span>
        </Link>
        
        {/* Navigation */}
        <div className="flex items-center gap-8">
          <Link to="/" className={`text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
            Jobs
          </Link>
          
          {user ? (
            <>
              <Link to="/saved" className={`text-sm font-medium transition-colors ${location.pathname === '/saved' ? 'text-black' : 'text-gray-400 hover:text-black'}`}>
                Saved
              </Link>
              <div className="flex items-center gap-4 pl-8 border-l border-gray-100">
                <img src={user.photoURL || 'https://via.placeholder.com/32'} alt="Profile" className="w-8 h-8 rounded-full" />
                <button onClick={logout} className="text-sm font-medium text-gray-400 hover:text-black transition-colors">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <button onClick={loginWithGoogle} className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}