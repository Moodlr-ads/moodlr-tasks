import requests
import sys
import json
from datetime import datetime

class TaskManagementAPITester:
    def __init__(self, base_url="https://flowdesk-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.workspace_id = None
        self.board_id = None
        self.group_id = None
        self.task_id = None
        self.status_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "email": f"test_user_{timestamp}@example.com",
            "name": f"Test User {timestamp}",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   Registered user: {response['user']['email']}")
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.token:
            print("❌ No token available for login test")
            return False
            
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_seed_demo_data(self):
        """Test seeding demo data"""
        success, response = self.run_test(
            "Seed Demo Data",
            "POST",
            "seed-demo-data",
            200
        )
        return success

    def test_get_workspaces(self):
        """Test getting workspaces"""
        success, response = self.run_test(
            "Get Workspaces",
            "GET",
            "workspaces",
            200
        )
        
        if success and response:
            if len(response) > 0:
                self.workspace_id = response[0]['id']
                print(f"   Found {len(response)} workspaces")
            return True
        return False

    def test_create_workspace(self):
        """Test creating a workspace"""
        workspace_data = {
            "name": "Test Workspace",
            "description": "Test workspace for API testing",
            "color": "#6366f1",
            "icon": "🧪"
        }
        
        success, response = self.run_test(
            "Create Workspace",
            "POST",
            "workspaces",
            200,
            data=workspace_data
        )
        
        if success and 'id' in response:
            self.workspace_id = response['id']
            print(f"   Created workspace: {response['name']}")
            return True
        return False

    def test_get_boards(self):
        """Test getting boards"""
        params = {"workspace_id": self.workspace_id} if self.workspace_id else None
        success, response = self.run_test(
            "Get Boards",
            "GET",
            "boards",
            200,
            params=params
        )
        
        if success and response:
            if len(response) > 0:
                self.board_id = response[0]['id']
                print(f"   Found {len(response)} boards")
            return True
        return False

    def test_create_board(self):
        """Test creating a board"""
        if not self.workspace_id:
            print("❌ No workspace_id available for board creation")
            return False
            
        board_data = {
            "workspace_id": self.workspace_id,
            "name": "Test Board",
            "description": "Test board for API testing",
            "color": "#3b82f6",
            "icon": "🧪"
        }
        
        success, response = self.run_test(
            "Create Board",
            "POST",
            "boards",
            200,
            data=board_data
        )
        
        if success and 'id' in response:
            self.board_id = response['id']
            print(f"   Created board: {response['name']}")
            return True
        return False

    def test_get_statuses(self):
        """Test getting statuses for a board"""
        if not self.board_id:
            print("❌ No board_id available for status retrieval")
            return False
            
        success, response = self.run_test(
            "Get Statuses",
            "GET",
            "statuses",
            200,
            params={"board_id": self.board_id}
        )
        
        if success and response:
            self.status_ids = [status['id'] for status in response]
            print(f"   Found {len(response)} statuses")
            return True
        return False

    def test_create_group(self):
        """Test creating a group"""
        if not self.board_id:
            print("❌ No board_id available for group creation")
            return False
            
        group_data = {
            "board_id": self.board_id,
            "name": "Test Group",
            "order": 0
        }
        
        success, response = self.run_test(
            "Create Group",
            "POST",
            "groups",
            200,
            data=group_data
        )
        
        if success and 'id' in response:
            self.group_id = response['id']
            print(f"   Created group: {response['name']}")
            return True
        return False

    def test_create_task(self):
        """Test creating a task"""
        if not self.board_id:
            print("❌ No board_id available for task creation")
            return False
            
        task_data = {
            "board_id": self.board_id,
            "group_id": self.group_id,
            "title": "Test Task",
            "description": "Test task for API testing",
            "priority": "high",
            "status_id": self.status_ids[0] if self.status_ids else None
        }
        
        success, response = self.run_test(
            "Create Task",
            "POST",
            "tasks",
            200,
            data=task_data
        )
        
        if success and 'id' in response:
            self.task_id = response['id']
            print(f"   Created task: {response['title']}")
            return True
        return False

    def test_get_tasks(self):
        """Test getting tasks"""
        params = {"board_id": self.board_id} if self.board_id else None
        success, response = self.run_test(
            "Get Tasks",
            "GET",
            "tasks",
            200,
            params=params
        )
        
        if success:
            print(f"   Found {len(response)} tasks")
            return True
        return False

    def test_update_task(self):
        """Test updating a task"""
        if not self.task_id:
            print("❌ No task_id available for task update")
            return False
            
        update_data = {
            "title": "Updated Test Task",
            "priority": "critical"
        }
        
        success, response = self.run_test(
            "Update Task",
            "PUT",
            f"tasks/{self.task_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   Updated task title: {response.get('title', 'N/A')}")
            return True
        return False

    def test_search_tasks(self):
        """Test task search functionality"""
        params = {
            "board_id": self.board_id,
            "search": "Test"
        }
        
        success, response = self.run_test(
            "Search Tasks",
            "GET",
            "tasks",
            200,
            params=params
        )
        
        if success:
            print(f"   Search returned {len(response)} tasks")
            return True
        return False

    def test_filter_tasks(self):
        """Test task filtering by priority"""
        params = {
            "board_id": self.board_id,
            "priority": "critical"
        }
        
        success, response = self.run_test(
            "Filter Tasks by Priority",
            "GET",
            "tasks",
            200,
            params=params
        )
        
        if success:
            print(f"   Filter returned {len(response)} critical tasks")
            return True
        return False

    def test_delete_task(self):
        """Test deleting a task"""
        if not self.task_id:
            print("❌ No task_id available for task deletion")
            return False
            
        success, response = self.run_test(
            "Delete Task",
            "DELETE",
            f"tasks/{self.task_id}",
            200
        )
        return success

def main():
    print("🚀 Starting TaskFlow Pro API Testing")
    print("=" * 50)
    
    tester = TaskManagementAPITester()
    
    # Test sequence
    test_sequence = [
        ("User Registration", tester.test_user_registration),
        ("User Authentication", tester.test_user_login),
        ("Seed Demo Data", tester.test_seed_demo_data),
        ("Get Workspaces", tester.test_get_workspaces),
        ("Create Workspace", tester.test_create_workspace),
        ("Get Boards", tester.test_get_boards),
        ("Create Board", tester.test_create_board),
        ("Get Statuses", tester.test_get_statuses),
        ("Create Group", tester.test_create_group),
        ("Create Task", tester.test_create_task),
        ("Get Tasks", tester.test_get_tasks),
        ("Update Task", tester.test_update_task),
        ("Search Tasks", tester.test_search_tasks),
        ("Filter Tasks", tester.test_filter_tasks),
        ("Delete Task", tester.test_delete_task),
    ]
    
    failed_tests = []
    
    for test_name, test_func in test_sequence:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"\n❌ Failed Tests ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print("\n✅ All tests passed!")
    
    print(f"\n🔗 API Base URL: {tester.base_url}")
    if tester.token:
        print(f"🔑 Auth Token: {tester.token[:20]}...")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())