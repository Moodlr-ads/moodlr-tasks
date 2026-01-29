# TaskFlow Pro

A professional, enterprise-grade task management system inspired by Monday.com and ClickUp. Built with React, FastAPI, and MongoDB with a clean architecture designed for easy migration to PHP + MySQL.

## 🎯 Overview

TaskFlow Pro is a complete task management solution featuring:
- **Multiple Workspaces** - Organize projects into separate workspaces
- **Flexible Boards** - Create unlimited boards with custom statuses
- **Smart Grouping** - Group tasks by teams, phases, or categories
- **4 View Types** - Table (spreadsheet-like), Kanban, Calendar, and List views
- **Inline Editing** - Edit task properties directly in the table view
- **Advanced Filtering** - Search and filter by status, priority, dates
- **Professional UI** - Clean, mature SaaS design with custom color palette

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python 3.8+)
- **Database**: MongoDB (designed for MySQL portability)
- **Authentication**: JWT-based with bcrypt password hashing
- **State Management**: React hooks and context
- **Drag & Drop**: @dnd-kit/core for Kanban view

### Project Structure
```
/app
├── backend/
│   ├── server.py          # FastAPI application with all routes
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js           # Authentication UI
│   │   │   ├── Layout.js          # Sidebar + TopBar layout
│   │   │   ├── Dashboard.js       # Workspace/board overview
│   │   │   ├── BoardView.js       # Main board container
│   │   │   ├── TableView.js       # Primary table view (hero)
│   │   │   ├── KanbanView.js      # Drag-and-drop kanban
│   │   │   ├── CalendarView.js    # Calendar view
│   │   │   ├── ListView.js        # Simple list view
│   │   │   ├── TaskSheet.js       # Task detail side panel
│   │   │   ├── StatusPill.js      # Status badge component
│   │   │   ├── PriorityBadge.js   # Priority indicator
│   │   │   └── ui/                # Shadcn UI components
│   │   ├── App.js         # Main app with routing
│   │   ├── App.css        # Custom styles
│   │   └── index.css      # Tailwind + design tokens
│   ├── package.json
│   └── .env
├── design_guidelines.json  # Design system specification
├── DATABASE_SCHEMA.md      # MySQL migration guide
└── README.md              # This file
```

## 🚀 Features

### ✅ Authentication
- User registration and login
- JWT token-based authentication
- Secure password hashing (bcrypt)
- Session persistence

### ✅ Workspaces
- Create multiple workspaces
- Assign colors and icons
- Workspace switching
- Owner management

### ✅ Boards
- Unlimited boards per workspace
- Custom board names, descriptions, colors, and icons
- Default status creation on board setup
- Board settings management

### ✅ Task Management
- Create, read, update, delete tasks
- **Task Properties**:
  - Title and rich description
  - Custom status per board
  - Priority (low, medium, high, critical)
  - Start date and due date
  - Group assignment
  - Display order
- Inline editing in table view
- Task detail side panel for full editing

### ✅ Groups
- Organize tasks into groups (e.g., "Frontend", "Backend")
- Reorderable groups
- Tasks can be ungrouped

### ✅ Statuses
- Customizable status workflow per board
- Color-coded status pills
- Default statuses: To Do, In Progress, Review, Done
- Easy status switching via dropdowns

### ✅ Views

**Table View (Primary)**
- Spreadsheet-like interface
- Inline editing of task titles
- Dropdown status and priority selectors
- Grouped task display
- Hover actions menu
- Drag handles for reordering

**Kanban View**
- Drag-and-drop between status columns
- Visual task cards with priority badges
- Column grouping by status
- Real-time task movement

**Calendar View**
- Monthly calendar display
- Tasks shown on due dates
- Quick task creation
- Month navigation

**List View**
- Simple task list with all details
- Status and priority badges
- Due date display
- Click to open details

### ✅ Search & Filters
- Real-time search across task titles and descriptions
- Filter by status
- Filter by priority
- Combined filter support

### ✅ Demo Data
- Automatic demo data seeding on first login
- 2 sample workspaces
- 3 sample boards
- 7 sample tasks with varied properties
- Sample groups and statuses

## 📊 Database Schema

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete MySQL migration guide.

### Core Entities
1. **users** - Authentication and profile
2. **workspaces** - Project containers
3. **boards** - Task boards
4. **groups** - Task groupings
5. **statuses** - Custom status labels
6. **tasks** - Individual task items

### Relationships
- Users → (1:many) → Workspaces
- Workspaces → (1:many) → Boards
- Boards → (1:many) → Groups, Statuses, Tasks
- Groups → (1:many) → Tasks
- Statuses → (1:many) → Tasks

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Workspaces
- `GET /api/workspaces` - List all workspaces
- `POST /api/workspaces` - Create workspace
- `PUT /api/workspaces/{id}` - Update workspace
- `DELETE /api/workspaces/{id}` - Delete workspace

### Boards
- `GET /api/boards?workspace_id={id}` - List boards
- `GET /api/boards/{id}` - Get board details
- `POST /api/boards` - Create board
- `PUT /api/boards/{id}` - Update board
- `DELETE /api/boards/{id}` - Delete board

### Groups
- `GET /api/groups?board_id={id}` - List groups
- `POST /api/groups` - Create group
- `PUT /api/groups/{id}` - Update group
- `DELETE /api/groups/{id}` - Delete group

### Statuses
- `GET /api/statuses?board_id={id}` - List statuses
- `POST /api/statuses` - Create status
- `PUT /api/statuses/{id}` - Update status
- `DELETE /api/statuses/{id}` - Delete status

### Tasks
- `GET /api/tasks?board_id={id}&status_id={id}&priority={level}&search={query}` - List/search/filter tasks
- `GET /api/tasks/{id}` - Get task details
- `POST /api/tasks` - Create task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### Demo Data
- `POST /api/seed-demo-data` - Seed demo workspaces, boards, and tasks

## 🎨 Design System

### Color Palette
- **Primary**: Deep Indigo (#6366f1 / hsl(243, 75%, 59%))
- **Background**: White (#ffffff)
- **Surface**: Light Slate (#f8fafc)
- **Border**: Slate 200 (#e2e8f0)
- **Text**: Slate 700/900

### Typography
- **Headings**: Plus Jakarta Sans (bold, professional)
- **Body**: Public Sans (readable, clean)
- **Code**: JetBrains Mono

### Components
- Rounded corners (8px default)
- Subtle shadows
- Smooth transitions
- Hover states on all interactive elements
- Focus rings for accessibility

## 🔐 Security

- **Password Hashing**: Bcrypt with salt
- **JWT Tokens**: 7-day expiration
- **CORS**: Configurable origins
- **Input Validation**: Pydantic models
- **SQL Injection Prevention**: MongoDB queries are naturally protected; prepared statements recommended for MySQL migration

## 🚦 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB running on localhost:27017

### Backend Setup
```bash
cd /app/backend
pip install -r requirements.txt
# Server runs on 0.0.0.0:8001 (managed by supervisor)
```

### Frontend Setup
```bash
cd /app/frontend
yarn install
# Development server runs on localhost:3000 (managed by supervisor)
```

### Environment Variables

**Backend (.env)**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=taskflow_db
JWT_SECRET=your-secret-key-here
CORS_ORIGINS=*
```

**Frontend (.env)**
```
REACT_APP_BACKEND_URL=https://your-domain.com
```

### Running the Application

Services are managed by supervisor:
```bash
sudo supervisorctl restart backend frontend
sudo supervisorctl status
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api

## 📝 Usage Guide

### First Time Setup
1. Navigate to the application
2. Click "Sign Up" and create an account
3. Demo data will be automatically loaded
4. Explore the 2 sample workspaces and 3 boards

### Creating a Workspace
1. Click "New Workspace" in the sidebar
2. Enter workspace name
3. Customize color and icon (optional)

### Creating a Board
1. Select a workspace
2. Click "+ Board" in the sidebar
3. Enter board name and details
4. Default statuses are created automatically

### Managing Tasks
1. Navigate to a board
2. Click "+ Task" to create a new task
3. Use the table view for quick inline editing
4. Click task title or actions menu → "View Details" for full editing
5. Drag tasks in Kanban view to change status
6. Use search and filters to find specific tasks

### Switching Views
- **Table View**: Best for bulk editing and data entry
- **Kanban View**: Best for workflow visualization
- **Calendar View**: Best for deadline management
- **List View**: Best for simple task overview

## 🔄 Migration to PHP + MySQL

This project is architected for easy migration:

1. **Database Schema**: See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete MySQL DDL
2. **API Structure**: RESTful design maps directly to PHP routes
3. **Business Logic**: Backend-driven, easily portable to PHP
4. **Frontend**: No changes needed - React app works with any backend

### Migration Steps
1. Create MySQL database using provided schema
2. Implement PHP REST API matching existing endpoints
3. Update frontend `REACT_APP_BACKEND_URL` to PHP backend
4. Migrate user data (hash passwords with same bcrypt algorithm)
5. Test all CRUD operations

## 🧪 Testing

Run backend API tests:
```bash
cd /app
python backend_test.py
```

All endpoints are tested for:
- Authentication flows
- CRUD operations
- Data validation
- Error handling
- Search and filtering

## 📈 Performance

- **Database Indexes**: Optimized queries on foreign keys
- **Pagination**: Ready for large datasets
- **Caching**: Frontend caches workspace/board data
- **Lazy Loading**: Tasks loaded per board
- **Debounced Search**: Reduces API calls

## 🎯 Future Enhancements

- [ ] Task assignments (multi-user)
- [ ] Task comments and activity log
- [ ] File attachments
- [ ] Labels/tags system
- [ ] Time tracking
- [ ] Email notifications
- [ ] Real-time collaboration (WebSocket)
- [ ] Export to CSV/PDF
- [ ] Mobile app (React Native)
- [ ] Dark mode
- [ ] Custom fields per board
- [ ] Automation rules
- [ ] Dashboard analytics

## 🤝 Contributing

This is a production-ready MVP. For future development:
1. Follow the existing code structure
2. Maintain separation between frontend and backend
3. Add tests for new features
4. Update DATABASE_SCHEMA.md for schema changes
5. Keep MySQL portability in mind

## 📄 License

Proprietary - TaskFlow Pro

## 🙏 Acknowledgments

- Design inspiration: Monday.com, ClickUp
- UI Components: Shadcn UI
- Icons: Lucide React
- Built with: React, FastAPI, MongoDB

---

**Version**: 1.0.0  
**Last Updated**: January 29, 2026  
**Status**: ✅ Production Ready
