from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'taskflow-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============================================================================
# MODELS (Designed for MySQL portability)
# ============================================================================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

class AuthResponse(BaseModel):
    token: str
    user: UserResponse

class Workspace(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    owner_id: str
    color: Optional[str] = '#6366f1'
    icon: Optional[str] = '📁'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = '#6366f1'
    icon: Optional[str] = '📁'

class Board(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    name: str
    description: Optional[str] = None
    color: Optional[str] = '#6366f1'
    icon: Optional[str] = '📋'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BoardCreate(BaseModel):
    workspace_id: str
    name: str
    description: Optional[str] = None
    color: Optional[str] = '#6366f1'
    icon: Optional[str] = '📋'

class Group(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    board_id: str
    name: str
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GroupCreate(BaseModel):
    board_id: str
    name: str
    order: Optional[int] = 0

class Status(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    board_id: str
    name: str
    color: str
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCreate(BaseModel):
    board_id: str
    name: str
    color: str
    order: Optional[int] = 0

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    board_id: str
    group_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    status_id: Optional[str] = None
    priority: str = 'medium'  # low, medium, high, critical
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaskCreate(BaseModel):
    board_id: str
    group_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    status_id: Optional[str] = None
    priority: Optional[str] = 'medium'
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    order: Optional[int] = 0

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status_id: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    group_id: Optional[str] = None
    order: Optional[int] = None

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    return decode_token(credentials.credentials)

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable format"""
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        result = {k: v for k, v in doc.items() if k != '_id'}
        for key, value in result.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
        return result
    return doc

# ============================================================================
# AUTHENTICATION ROUTES
# ============================================================================

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hash_password(user_data.password)
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    # Create token
    token = create_token(user.id)
    
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            created_at=user.created_at
        )
    )

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(credentials.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Convert ISO string to datetime
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**user_doc)
    token = create_token(user.id)
    
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            created_at=user.created_at
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user_id: str = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**user_doc)
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at
    )

# ============================================================================
# WORKSPACE ROUTES
# ============================================================================

@api_router.get("/workspaces", response_model=List[Workspace])
async def get_workspaces(user_id: str = Depends(get_current_user)):
    workspaces = await db.workspaces.find({"owner_id": user_id}, {"_id": 0}).to_list(1000)
    return [serialize_doc(w) for w in workspaces]

@api_router.post("/workspaces", response_model=Workspace)
async def create_workspace(workspace_data: WorkspaceCreate, user_id: str = Depends(get_current_user)):
    workspace = Workspace(
        **workspace_data.model_dump(),
        owner_id=user_id
    )
    
    doc = serialize_doc(workspace.model_dump())
    await db.workspaces.insert_one(doc)
    return workspace

@api_router.put("/workspaces/{workspace_id}", response_model=Workspace)
async def update_workspace(workspace_id: str, workspace_data: WorkspaceCreate, user_id: str = Depends(get_current_user)):
    result = await db.workspaces.update_one(
        {"id": workspace_id, "owner_id": user_id},
        {"$set": serialize_doc(workspace_data.model_dump())}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    workspace_doc = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    return serialize_doc(workspace_doc)

@api_router.delete("/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str, user_id: str = Depends(get_current_user)):
    result = await db.workspaces.delete_one({"id": workspace_id, "owner_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Delete associated boards, groups, tasks, statuses
    await db.boards.delete_many({"workspace_id": workspace_id})
    return {"message": "Workspace deleted"}

# ============================================================================
# BOARD ROUTES
# ============================================================================

@api_router.get("/boards", response_model=List[Board])
async def get_boards(workspace_id: Optional[str] = None, user_id: str = Depends(get_current_user)):
    query = {}
    if workspace_id:
        query["workspace_id"] = workspace_id
    
    boards = await db.boards.find(query, {"_id": 0}).to_list(1000)
    return [serialize_doc(b) for b in boards]

@api_router.get("/boards/{board_id}", response_model=Board)
async def get_board(board_id: str, user_id: str = Depends(get_current_user)):
    board = await db.boards.find_one({"id": board_id}, {"_id": 0})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return serialize_doc(board)

@api_router.post("/boards", response_model=Board)
async def create_board(board_data: BoardCreate, user_id: str = Depends(get_current_user)):
    # Verify workspace ownership
    workspace = await db.workspaces.find_one({"id": board_data.workspace_id, "owner_id": user_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    board = Board(**board_data.model_dump())
    doc = serialize_doc(board.model_dump())
    await db.boards.insert_one(doc)
    
    # Create default statuses
    default_statuses = [
        {"name": "To Do", "color": "#94a3b8", "order": 0},
        {"name": "In Progress", "color": "#3b82f6", "order": 1},
        {"name": "Review", "color": "#a855f7", "order": 2},
        {"name": "Done", "color": "#10b981", "order": 3}
    ]
    
    for status_data in default_statuses:
        status = Status(board_id=board.id, **status_data)
        await db.statuses.insert_one(serialize_doc(status.model_dump()))
    
    return board

@api_router.put("/boards/{board_id}", response_model=Board)
async def update_board(board_id: str, board_data: BoardCreate, user_id: str = Depends(get_current_user)):
    result = await db.boards.update_one(
        {"id": board_id},
        {"$set": serialize_doc(board_data.model_dump())}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Board not found")
    
    board_doc = await db.boards.find_one({"id": board_id}, {"_id": 0})
    return serialize_doc(board_doc)

@api_router.delete("/boards/{board_id}")
async def delete_board(board_id: str, user_id: str = Depends(get_current_user)):
    result = await db.boards.delete_one({"id": board_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Board not found")
    
    # Delete associated groups, tasks, statuses
    await db.groups.delete_many({"board_id": board_id})
    await db.tasks.delete_many({"board_id": board_id})
    await db.statuses.delete_many({"board_id": board_id})
    return {"message": "Board deleted"}

# ============================================================================
# GROUP ROUTES
# ============================================================================

@api_router.get("/groups", response_model=List[Group])
async def get_groups(board_id: str, user_id: str = Depends(get_current_user)):
    groups = await db.groups.find({"board_id": board_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    return [serialize_doc(g) for g in groups]

@api_router.post("/groups", response_model=Group)
async def create_group(group_data: GroupCreate, user_id: str = Depends(get_current_user)):
    group = Group(**group_data.model_dump())
    doc = serialize_doc(group.model_dump())
    await db.groups.insert_one(doc)
    return group

@api_router.put("/groups/{group_id}", response_model=Group)
async def update_group(group_id: str, group_data: GroupCreate, user_id: str = Depends(get_current_user)):
    result = await db.groups.update_one(
        {"id": group_id},
        {"$set": serialize_doc(group_data.model_dump())}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group_doc = await db.groups.find_one({"id": group_id}, {"_id": 0})
    return serialize_doc(group_doc)

@api_router.delete("/groups/{group_id}")
async def delete_group(group_id: str, user_id: str = Depends(get_current_user)):
    result = await db.groups.delete_one({"id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"message": "Group deleted"}

# ============================================================================
# STATUS ROUTES
# ============================================================================

@api_router.get("/statuses", response_model=List[Status])
async def get_statuses(board_id: str, user_id: str = Depends(get_current_user)):
    statuses = await db.statuses.find({"board_id": board_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    return [serialize_doc(s) for s in statuses]

@api_router.post("/statuses", response_model=Status)
async def create_status(status_data: StatusCreate, user_id: str = Depends(get_current_user)):
    status = Status(**status_data.model_dump())
    doc = serialize_doc(status.model_dump())
    await db.statuses.insert_one(doc)
    return status

@api_router.put("/statuses/{status_id}", response_model=Status)
async def update_status(status_id: str, status_data: StatusCreate, user_id: str = Depends(get_current_user)):
    result = await db.statuses.update_one(
        {"id": status_id},
        {"$set": serialize_doc(status_data.model_dump())}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Status not found")
    
    status_doc = await db.statuses.find_one({"id": status_id}, {"_id": 0})
    return serialize_doc(status_doc)

@api_router.delete("/statuses/{status_id}")
async def delete_status(status_id: str, user_id: str = Depends(get_current_user)):
    result = await db.statuses.delete_one({"id": status_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Status not found")
    return {"message": "Status deleted"}

# ============================================================================
# TASK ROUTES
# ============================================================================

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(
    board_id: Optional[str] = None,
    group_id: Optional[str] = None,
    status_id: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    query = {}
    if board_id:
        query["board_id"] = board_id
    if group_id:
        query["group_id"] = group_id
    if status_id:
        query["status_id"] = status_id
    if priority:
        query["priority"] = priority
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
    return [serialize_doc(t) for t in tasks]

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str, user_id: str = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return serialize_doc(task)

@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, user_id: str = Depends(get_current_user)):
    task = Task(**task_data.model_dump())
    doc = serialize_doc(task.model_dump())
    await db.tasks.insert_one(doc)
    return task

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_data: TaskUpdate, user_id: str = Depends(get_current_user)):
    update_data = {k: v for k, v in task_data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.tasks.update_one(
        {"id": task_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_doc = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return serialize_doc(task_doc)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user_id: str = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

# ============================================================================
# SEED DATA ROUTE (for demo purposes)
# ============================================================================

@api_router.post("/seed-demo-data")
async def seed_demo_data(user_id: str = Depends(get_current_user)):
    # Check if user already has workspaces
    existing = await db.workspaces.find_one({"owner_id": user_id})
    if existing:
        return {"message": "Demo data already exists"}
    
    # Create workspaces
    workspace1 = Workspace(
        name="Product Development",
        description="Main product workspace",
        owner_id=user_id,
        color="#6366f1",
        icon="🚀"
    )
    await db.workspaces.insert_one(serialize_doc(workspace1.model_dump()))
    
    workspace2 = Workspace(
        name="Marketing",
        description="Marketing campaigns and content",
        owner_id=user_id,
        color="#ec4899",
        icon="📢"
    )
    await db.workspaces.insert_one(serialize_doc(workspace2.model_dump()))
    
    # Create boards for workspace 1
    board1 = Board(
        workspace_id=workspace1.id,
        name="Q1 Sprint Planning",
        description="Sprint planning for Q1 2025",
        color="#6366f1",
        icon="📋"
    )
    await db.boards.insert_one(serialize_doc(board1.model_dump()))
    
    board2 = Board(
        workspace_id=workspace1.id,
        name="Bug Tracking",
        description="Track and resolve bugs",
        color="#ef4444",
        icon="🐛"
    )
    await db.boards.insert_one(serialize_doc(board2.model_dump()))
    
    # Create board for workspace 2
    board3 = Board(
        workspace_id=workspace2.id,
        name="Content Calendar",
        description="Social media and blog content",
        color="#ec4899",
        icon="📅"
    )
    await db.boards.insert_one(serialize_doc(board3.model_dump()))
    
    # Create statuses for board1
    statuses1 = [
        Status(board_id=board1.id, name="To Do", color="#94a3b8", order=0),
        Status(board_id=board1.id, name="In Progress", color="#3b82f6", order=1),
        Status(board_id=board1.id, name="Review", color="#a855f7", order=2),
        Status(board_id=board1.id, name="Done", color="#10b981", order=3)
    ]
    for status in statuses1:
        await db.statuses.insert_one(serialize_doc(status.model_dump()))
    
    # Create statuses for board2
    statuses2 = [
        Status(board_id=board2.id, name="New", color="#94a3b8", order=0),
        Status(board_id=board2.id, name="In Progress", color="#3b82f6", order=1),
        Status(board_id=board2.id, name="Testing", color="#f59e0b", order=2),
        Status(board_id=board2.id, name="Resolved", color="#10b981", order=3)
    ]
    for status in statuses2:
        await db.statuses.insert_one(serialize_doc(status.model_dump()))
    
    # Create statuses for board3
    statuses3 = [
        Status(board_id=board3.id, name="Idea", color="#94a3b8", order=0),
        Status(board_id=board3.id, name="Draft", color="#f59e0b", order=1),
        Status(board_id=board3.id, name="Scheduled", color="#3b82f6", order=2),
        Status(board_id=board3.id, name="Published", color="#10b981", order=3)
    ]
    for status in statuses3:
        await db.statuses.insert_one(serialize_doc(status.model_dump()))
    
    # Create groups for board1
    group1 = Group(board_id=board1.id, name="Frontend", order=0)
    await db.groups.insert_one(serialize_doc(group1.model_dump()))
    
    group2 = Group(board_id=board1.id, name="Backend", order=1)
    await db.groups.insert_one(serialize_doc(group2.model_dump()))
    
    group3 = Group(board_id=board1.id, name="Design", order=2)
    await db.groups.insert_one(serialize_doc(group3.model_dump()))
    
    # Create tasks
    now = datetime.now(timezone.utc)
    tasks = [
        Task(
            board_id=board1.id,
            group_id=group1.id,
            title="Implement user authentication",
            description="Add JWT-based authentication with login/logout",
            status_id=statuses1[1].id,
            priority="high",
            start_date=now,
            due_date=now + timedelta(days=5),
            order=0
        ),
        Task(
            board_id=board1.id,
            group_id=group1.id,
            title="Build dashboard layout",
            description="Create responsive dashboard with sidebar and topbar",
            status_id=statuses1[2].id,
            priority="high",
            start_date=now,
            due_date=now + timedelta(days=3),
            order=1
        ),
        Task(
            board_id=board1.id,
            group_id=group1.id,
            title="Add drag and drop functionality",
            description="Implement drag and drop for tasks",
            status_id=statuses1[0].id,
            priority="medium",
            due_date=now + timedelta(days=7),
            order=2
        ),
        Task(
            board_id=board1.id,
            group_id=group2.id,
            title="Design database schema",
            description="Create normalized schema for MySQL portability",
            status_id=statuses1[3].id,
            priority="critical",
            start_date=now - timedelta(days=2),
            due_date=now,
            order=0
        ),
        Task(
            board_id=board1.id,
            group_id=group2.id,
            title="Implement REST API endpoints",
            description="Build CRUD endpoints for all entities",
            status_id=statuses1[1].id,
            priority="high",
            start_date=now,
            due_date=now + timedelta(days=4),
            order=1
        ),
        Task(
            board_id=board1.id,
            group_id=group3.id,
            title="Create design system",
            description="Define colors, typography, and component styles",
            status_id=statuses1[3].id,
            priority="medium",
            start_date=now - timedelta(days=3),
            due_date=now - timedelta(days=1),
            order=0
        ),
        Task(
            board_id=board1.id,
            group_id=group3.id,
            title="Design table view mockups",
            description="Create high-fidelity mockups for table view",
            status_id=statuses1[2].id,
            priority="medium",
            start_date=now,
            due_date=now + timedelta(days=2),
            order=1
        ),
    ]
    
    for task in tasks:
        await db.tasks.insert_one(serialize_doc(task.model_dump()))
    
    return {"message": "Demo data created successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
