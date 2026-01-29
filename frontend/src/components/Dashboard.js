import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Plus, Folder, Clock } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Dashboard = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const loadData = async () => {
    try {
      const [workspacesRes, boardsRes] = await Promise.all([
        axios.get(`${API}/workspaces`, getAuthHeaders()),
        axios.get(`${API}/boards`, getAuthHeaders())
      ]);
      
      setWorkspaces(workspacesRes.data);
      setBoards(boardsRes.data);

      // Check if we need to seed demo data
      if (workspacesRes.data.length === 0) {
        await seedDemoData();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const seedDemoData = async () => {
    try {
      await axios.post(`${API}/seed-demo-data`, {}, getAuthHeaders());
      toast.success('Demo data loaded');
      loadData();
    } catch (error) {
      console.error('Failed to seed demo data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Dashboard
        </h1>
        <p className="text-slate-600">Welcome back! Here's an overview of your workspaces and boards.</p>
      </div>

      {/* Workspaces Section */}
      <section className="mb-8" data-testid="workspaces-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Workspaces
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              data-testid={`workspace-card-${workspace.id}`}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{workspace.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">{workspace.name}</h3>
                  <p className="text-sm text-slate-600">{workspace.description}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Folder className="h-3 w-3" />
                    {boards.filter(b => b.workspace_id === workspace.id).length} boards
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Boards */}
      <section data-testid="boards-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Your Boards
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {boards.map((board) => {
            const workspace = workspaces.find(w => w.id === board.workspace_id);
            return (
              <div
                key={board.id}
                data-testid={`board-card-${board.id}`}
                onClick={() => navigate(`/board/${board.id}`)}
                className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{board.icon}</span>
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: board.color }}
                  />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-primary transition-colors">
                  {board.name}
                </h3>
                <p className="text-xs text-slate-600 mb-3 line-clamp-2">{board.description}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  {workspace?.name}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
