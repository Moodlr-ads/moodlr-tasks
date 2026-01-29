# TaskFlow Pro - Database Schema Documentation

## Overview
This document describes the database schema for TaskFlow Pro. The current implementation uses MongoDB, but the schema is designed to be easily portable to MySQL.

## Entity Relationship Diagram

```
users (1) ----< (many) workspaces
workspaces (1) ----< (many) boards
boards (1) ----< (many) groups
boards (1) ----< (many) statuses
boards (1) ----< (many) tasks
groups (1) ----< (many) tasks
statuses (1) ----< (many) tasks
```

## Tables / Collections

### 1. users
Stores user authentication and profile information.

**Fields:**
- `id` (VARCHAR/UUID, PRIMARY KEY) - Unique user identifier
- `email` (VARCHAR, UNIQUE, NOT NULL) - User email address
- `name` (VARCHAR, NOT NULL) - Full name
- `password_hash` (VARCHAR, NOT NULL) - Bcrypt hashed password
- `created_at` (TIMESTAMP, NOT NULL) - Account creation timestamp

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `email`

**MySQL DDL:**
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 2. workspaces
Organizational containers for boards.

**Fields:**
- `id` (VARCHAR/UUID, PRIMARY KEY) - Unique workspace identifier
- `name` (VARCHAR, NOT NULL) - Workspace name
- `description` (TEXT, NULL) - Optional description
- `owner_id` (VARCHAR/UUID, FOREIGN KEY -> users.id) - Workspace owner
- `color` (VARCHAR, DEFAULT '#6366f1') - UI color hex code
- `icon` (VARCHAR, DEFAULT '📁') - Emoji icon
- `created_at` (TIMESTAMP, NOT NULL) - Creation timestamp

**Relationships:**
- Many-to-One with `users` (owner_id)
- One-to-Many with `boards`

**MySQL DDL:**
```sql
CREATE TABLE workspaces (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id VARCHAR(36) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    icon VARCHAR(10) DEFAULT '📁',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 3. boards
Task boards within workspaces.

**Fields:**
- `id` (VARCHAR/UUID, PRIMARY KEY) - Unique board identifier
- `workspace_id` (VARCHAR/UUID, FOREIGN KEY -> workspaces.id) - Parent workspace
- `name` (VARCHAR, NOT NULL) - Board name
- `description` (TEXT, NULL) - Optional description
- `color` (VARCHAR, DEFAULT '#6366f1') - UI color hex code
- `icon` (VARCHAR, DEFAULT '📋') - Emoji icon
- `created_at` (TIMESTAMP, NOT NULL) - Creation timestamp

**Relationships:**
- Many-to-One with `workspaces` (workspace_id)
- One-to-Many with `groups`, `statuses`, `tasks`

**MySQL DDL:**
```sql
CREATE TABLE boards (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    icon VARCHAR(10) DEFAULT '📋',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    INDEX idx_workspace (workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 4. groups
Organizational sections within boards (e.g., "Frontend", "Backend").

**Fields:**
- `id` (VARCHAR/UUID, PRIMARY KEY) - Unique group identifier
- `board_id` (VARCHAR/UUID, FOREIGN KEY -> boards.id) - Parent board
- `name` (VARCHAR, NOT NULL) - Group name
- `order` (INT, DEFAULT 0) - Display order
- `created_at` (TIMESTAMP, NOT NULL) - Creation timestamp

**Relationships:**
- Many-to-One with `boards` (board_id)
- One-to-Many with `tasks`

**MySQL DDL:**
```sql
CREATE TABLE groups (
    id VARCHAR(36) PRIMARY KEY,
    board_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    `order` INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    INDEX idx_board_order (board_id, `order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 5. statuses
Custom status labels for tasks (e.g., "To Do", "In Progress", "Done").

**Fields:**
- `id` (VARCHAR/UUID, PRIMARY KEY) - Unique status identifier
- `board_id` (VARCHAR/UUID, FOREIGN KEY -> boards.id) - Parent board
- `name` (VARCHAR, NOT NULL) - Status name
- `color` (VARCHAR, NOT NULL) - Hex color code for UI
- `order` (INT, DEFAULT 0) - Display order
- `created_at` (TIMESTAMP, NOT NULL) - Creation timestamp

**Relationships:**
- Many-to-One with `boards` (board_id)
- One-to-Many with `tasks`

**MySQL DDL:**
```sql
CREATE TABLE statuses (
    id VARCHAR(36) PRIMARY KEY,
    board_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) NOT NULL,
    `order` INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    INDEX idx_board_order (board_id, `order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 6. tasks
Individual task items with full details.

**Fields:**
- `id` (VARCHAR/UUID, PRIMARY KEY) - Unique task identifier
- `board_id` (VARCHAR/UUID, FOREIGN KEY -> boards.id) - Parent board
- `group_id` (VARCHAR/UUID, FOREIGN KEY -> groups.id, NULL) - Optional group
- `title` (VARCHAR, NOT NULL) - Task title
- `description` (TEXT, NULL) - Detailed description
- `status_id` (VARCHAR/UUID, FOREIGN KEY -> statuses.id, NULL) - Current status
- `priority` (ENUM, DEFAULT 'medium') - Priority level: low, medium, high, critical
- `start_date` (DATE, NULL) - Optional start date
- `due_date` (DATE, NULL) - Optional due date
- `order` (INT, DEFAULT 0) - Display order within group/board
- `created_at` (TIMESTAMP, NOT NULL) - Creation timestamp
- `updated_at` (TIMESTAMP, NOT NULL) - Last update timestamp

**Relationships:**
- Many-to-One with `boards` (board_id)
- Many-to-One with `groups` (group_id, optional)
- Many-to-One with `statuses` (status_id, optional)

**MySQL DDL:**
```sql
CREATE TABLE tasks (
    id VARCHAR(36) PRIMARY KEY,
    board_id VARCHAR(36) NOT NULL,
    group_id VARCHAR(36),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status_id VARCHAR(36),
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    start_date DATE,
    due_date DATE,
    `order` INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
    FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE SET NULL,
    INDEX idx_board (board_id),
    INDEX idx_group (group_id),
    INDEX idx_status (status_id),
    INDEX idx_due_date (due_date),
    INDEX idx_priority (priority),
    FULLTEXT INDEX idx_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Migration Notes

### From MongoDB to MySQL

1. **UUID Generation**: MongoDB uses string UUIDs via Python's uuid.uuid4(). MySQL can use VARCHAR(36) or BINARY(16) for storage.

2. **Timestamps**: MongoDB stores ISO strings. MySQL uses native TIMESTAMP/DATETIME types.

3. **Enums**: Priority field uses string values in MongoDB. MySQL ENUM provides type safety.

4. **Cascading Deletes**: 
   - Deleting a workspace → deletes all boards → deletes all groups, statuses, tasks
   - Deleting a board → deletes all groups, statuses, tasks
   - Deleting a group → sets tasks.group_id to NULL
   - Deleting a status → sets tasks.status_id to NULL

5. **Indexes**: 
   - Add indexes on foreign keys for JOIN performance
   - Add composite indexes for common queries (board_id + order)
   - Add FULLTEXT index on task title/description for search

### Performance Considerations

- **Pagination**: For large task lists, implement LIMIT/OFFSET queries
- **Caching**: Consider caching workspace/board data
- **Soft Deletes**: Optionally add `deleted_at` columns for soft delete functionality
- **Audit Trail**: Add `created_by`, `updated_by` fields for audit purposes

---

## API Endpoints and Database Access Patterns

### Common Queries

**Get all boards in a workspace:**
```sql
SELECT * FROM boards WHERE workspace_id = ? ORDER BY created_at DESC;
```

**Get all tasks for a board with groups and statuses:**
```sql
SELECT 
    t.*,
    g.name as group_name,
    s.name as status_name,
    s.color as status_color
FROM tasks t
LEFT JOIN groups g ON t.group_id = g.id
LEFT JOIN statuses s ON t.status_id = s.id
WHERE t.board_id = ?
ORDER BY g.order, t.order;
```

**Search tasks:**
```sql
SELECT * FROM tasks 
WHERE board_id = ? 
AND (title LIKE ? OR description LIKE ?)
ORDER BY created_at DESC;
```

**Filter tasks by status and priority:**
```sql
SELECT * FROM tasks 
WHERE board_id = ? 
AND status_id = ? 
AND priority = ?
ORDER BY due_date ASC;
```

---

## Data Integrity Rules

1. **User deletion**: Cascade deletes all workspaces owned by user
2. **Workspace deletion**: Cascade deletes all boards and their content
3. **Board deletion**: Cascade deletes all groups, statuses, and tasks
4. **Group deletion**: Sets tasks.group_id to NULL (tasks remain)
5. **Status deletion**: Sets tasks.status_id to NULL (tasks remain)

## Future Enhancements

- **Task assignments**: Add `assignees` join table (tasks ↔ users)
- **Comments**: Add `task_comments` table
- **Attachments**: Add `task_attachments` table
- **Activity log**: Add `activity_log` table for audit trail
- **Labels/Tags**: Add `labels` table and `task_labels` join table
- **Time tracking**: Add time_estimate and time_spent fields
- **Subtasks**: Add parent_task_id self-referencing foreign key

---

**Document Version**: 1.0  
**Last Updated**: January 29, 2026  
**Author**: TaskFlow Pro Development Team
