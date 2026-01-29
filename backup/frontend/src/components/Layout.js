import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { 
  LayoutDashboard, 
  Plus, 
  ChevronDown, 
  Settings,
  LogOut,
  Menu,
  X,
  Folder
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [workspaces, setWorkspaces] = useState([]);
  const [boards, setBoards] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (currentWorkspace) {
      loadBoards(currentWorkspace.id);
    }
  }, [currentWorkspace]);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const loadWorkspaces = async () => {
    try {
      const response = await axios.get(`${API}/workspaces`, getAuthHeaders());
      setWorkspaces(response.data);
      if (response.data.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const loadBoards = async (workspaceId) => {
    try {
      const response = await axios.get(`${API}/boards?workspace_id=${workspaceId}`, getAuthHeaders());
      setBoards(response.data);
    } catch (error) {
      console.error('Failed to load boards:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleCreateWorkspace = async () => {
    const name = prompt('Workspace name:');
    if (!name) return;

    try {
      const response = await axios.post(
        `${API}/workspaces`,
        { name, color: '#6366f1', icon: '📁' },
        getAuthHeaders()
      );
      setWorkspaces([...workspaces, response.data]);
      setCurrentWorkspace(response.data);
      toast.success('Workspace created');
    } catch (error) {
      toast.error('Failed to create workspace');
    }
  };

  const handleCreateBoard = async () => {
    if (!currentWorkspace) {
      toast.error('Please select a workspace first');
      return;
    }

    const name = prompt('Board name:');
    if (!name) return;

    try {
      const response = await axios.post(
        `${API}/boards`,
        { 
          workspace_id: currentWorkspace.id,
          name,
          color: '#6366f1',
          icon: '📋'
        },
        getAuthHeaders()
      );
      setBoards([...boards, response.data]);
      toast.success('Board created');
      navigate(`/board/${response.data.id}`);
    } catch (error) {
      toast.error('Failed to create board');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-white border-r border-slate-200 transition-all duration-300 flex flex-col`}
      >
        {sidebarOpen && (
          <>
            {/* Sidebar Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                TaskFlow Pro
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSidebarOpen(false)}
                data-testid="close-sidebar-button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Workspace Selector */}
            <div className="p-4 border-b border-slate-200">
              <button
                data-testid="workspace-selector"
                className="w-full flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{currentWorkspace?.icon || '📁'}</span>
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {currentWorkspace?.name || 'Select Workspace'}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 justify-start text-slate-600 hover:text-slate-900"
                onClick={handleCreateWorkspace}
                data-testid="create-workspace-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Workspace
              </Button>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => navigate('/dashboard')}
                  data-testid="dashboard-nav-button"
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </div>

              <Separator className="my-4" />

              {/* Boards */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Boards
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCreateBoard}
                    data-testid="create-board-button"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {boards.map((board) => (
                    <Button
                      key={board.id}
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start ${
                        location.pathname.includes(board.id)
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      onClick={() => navigate(`/board/${board.id}`)}
                      data-testid={`board-nav-${board.id}`}
                    >
                      <span className="mr-2">{board.icon}</span>
                      <span className="truncate">{board.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </ScrollArea>

            {/* User Footer */}
            <div className="p-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: 'hsl(243, 75%, 59%)' }}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleLogout}
                  data-testid="logout-button"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSidebarOpen(true)}
                data-testid="open-sidebar-button"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
