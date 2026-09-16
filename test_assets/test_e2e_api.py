import os
import sys

# Ensure backend directory is in path
backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, backend_path)

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_full_api_flow():
    print("--- 1. Health Check Verification ---")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("Health check response:", res.json())

    print("\n--- 2. Officer Authentication Verification ---")
    login_res = client.post("/api/auth/login", json={
        "email": "inspector@officer.demo",
        "password": "Officer@2026!"
    })
    assert login_res.status_code == 200, f"Officer login failed: {login_res.text}"
    officer_data = login_res.json()
    assert officer_data["user"]["role"] == "OFFICER"
    officer_token = officer_data["access_token"]
    print("Officer login verified. Role:", officer_data["user"]["role"], "Name:", officer_data["user"]["display_name"])

    print("\n--- 3. Consumer Authentication Verification ---")
    cit_res = client.post("/api/auth/login", json={
        "email": "citizen@gmail.com",
        "password": "Citizen@2026!"
    })
    assert cit_res.status_code == 200, f"Citizen login failed: {cit_res.text}"
    citizen_data = cit_res.json()
    assert citizen_data["user"]["role"] == "USER"
    citizen_token = citizen_data["access_token"]
    print("Citizen login verified. Role:", citizen_data["user"]["role"], "Name:", citizen_data["user"]["display_name"])


    print("\n--- 4. Invalid Credentials Rejection Verification ---")
    bad_res = client.post("/api/auth/login", json={
        "email": "citizen@gmail.com",
        "password": "WrongPassword123"
    })
    assert bad_res.status_code == 401
    assert "Unable to sign in" in bad_res.json()["detail"]
    print("Invalid credentials properly rejected with generic message.")

    print("\n--- 5. Protected /api/auth/me Verification ---")
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {officer_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "inspector@officer.demo"
    print("Auth /me verified for officer.")

    print("\n--- 6. Consumer Complaint Submission ---")
    complaint_res = client.post("/api/complaints", json={
        "product_name": "Premium Basmati Rice 5kg",
        "issue_category": "missing_qty",
        "description": "Net quantity is not printed in standard font size.",
        "contact_email": "citizen@gmail.com"
    }, headers={"Authorization": f"Bearer {citizen_token}"})
    assert complaint_res.status_code == 200, f"Complaint creation failed: {complaint_res.text}"
    complaint_data = complaint_res.json()
    new_complaint_id = complaint_data["id"]
    print(f"Complaint created: {new_complaint_id}, Status: {complaint_data['status']}")

    print("\n--- 7. Data Boundary Verification ---")
    # Citizen list complaints
    c_list_res = client.get("/api/complaints", headers={"Authorization": f"Bearer {citizen_token}"})
    assert c_list_res.status_code == 200
    c_list = c_list_res.json()
    for c in c_list:
        assert c["user_id"] == citizen_data["user"]["id"]
    print(f"Citizen sees {len(c_list)} complaints (strictly own submissions).")

    # Officer list complaints
    o_list_res = client.get("/api/complaints", headers={"Authorization": f"Bearer {officer_token}"})
    assert o_list_res.status_code == 200
    o_list = o_list_res.json()
    assert len(o_list) >= len(c_list)
    print(f"Officer sees {len(o_list)} complaints (comprehensive enforcement view).")

    print("\n--- 8. Role Authorization Boundary on Complaint Status Update ---")
    # Citizen attempts to update status (Must fail with 403 Forbidden)
    unauth_patch = client.patch(f"/api/complaints/{new_complaint_id}/status", json={
        "status": "RESOLVED"
    }, headers={"Authorization": f"Bearer {citizen_token}"})
    assert unauth_patch.status_code == 403, f"Expected 403, got {unauth_patch.status_code}"
    print("Citizen forbidden from updating complaint status (403 confirmed).")

    # Officer updates status (Must succeed with 200)
    auth_patch = client.patch(f"/api/complaints/{new_complaint_id}/status", json={
        "status": "UNDER_REVIEW",
        "officer_notes": "Assigned to Field Inspector for physical verification under Rule 11."
    }, headers={"Authorization": f"Bearer {officer_token}"})
    assert auth_patch.status_code == 200
    updated_complaint = auth_patch.json()
    assert updated_complaint["status"] == "UNDER_REVIEW"
    assert "Rule 11" in updated_complaint["officer_notes"]
    print(f"Officer successfully updated complaint status to {updated_complaint['status']}.")

    print("\n--- 9. Logout Verification ---")
    logout_res = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {officer_token}"})
    assert logout_res.status_code == 200
    print("Officer logout audit recorded.")

    print("\n=======================================================")
    print("ALL PROMPT 7 BACKEND API & SECURITY TESTS PASSED 100%!")
    print("=======================================================")

if __name__ == "__main__":
    test_full_api_flow()
