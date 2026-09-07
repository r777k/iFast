import { NavLink, Outlet } from 'react-router-dom';
import { Home, Calendar, BarChart2, Settings, Play, LogOut } from 'lucide-react'; // <-- Add LogOut
import { useAuth } from '../context/AuthContext'; // <-- Add this import

export default function Layout() {
  const { logout } = useAuth(); // <-- Extract logout function

  const navItems = [
    { name: 'Today', path: '/', icon: Home },
    { name: 'History', path: '/history', icon: Calendar },
    { name: 'Insights', path: '/insights', icon: BarChart2 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark text-text-primary dark:text-text-light flex flex-col md:flex-row font-sans">
      
      {/* Desktop/Tablet Sidebar Navigation */}
      <nav className="hidden md:flex flex-col w-64 border-r border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-4 py-6">
        <div className="text-xl font-semibold mb-8 text-primary px-4">FastTracker</div>
        
        <div className="flex flex-col gap-2 flex-grow">
          {navItems.map((item) => (
            <NavLink 
              key={item.name} 
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-text-secondary'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </div>
        
        {/* Desktop Logout Button */}
        <div className="mt-auto pt-6 border-t border-border dark:border-border-dark">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-text-secondary hover:text-status-error hover:bg-status-error/10 transition-colors font-medium text-left"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto">
         <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar (Remains unchanged) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark z-50">
        <div className="flex justify-around items-center h-16 px-2 relative">
          {navItems.slice(0, 2).map((item) => (
            <NavLink key={item.name} to={item.path} className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-150 ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </NavLink>
          ))}
          {/* Mobile spacing for visual alignment */}
          <div className="w-full"></div>
          {navItems.slice(2, 4).map((item) => (
            <NavLink key={item.name} to={item.path} className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-150 ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      
    </div>
  );
}