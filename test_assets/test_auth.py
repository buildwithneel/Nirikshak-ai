import os
import sys

# Ensure backend directory is in path
backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, backend_path)

from auth.service import auth_service
from auth.models import UserLogin, ComplaintCreate, ComplaintStatus
from auth.security import determine_role_from_email, create_access_token, decode_access_token

def test_auth():
    print("Testing role detection...")
    assert determine_role_from_email("inspector@officer.demo") == "OFFICER"
    assert determine_role_from_email("official@legalmetrology.gov.in") == "OFFICER"
    assert determine_role_from_email("citizen@gmail.com") == "USER"
    assert determine_role_from_email("user@yahoo.co.in") == "USER"
    print("Role detection OK.")

    print("Testing officer login...")
    officer = auth_service.authenticate_user("inspector@officer.demo", "Officer@2026!")
    assert officer is not None
    assert officer.role == "OFFICER"
    print("Officer login OK:", officer.display_name, officer.role)

    print("Testing consumer login...")
    consumer = auth_service.authenticate_user("citizen@gmail.com", "Citizen@2026!")
    assert consumer is not None
    assert consumer.role == "USER"
    print("Consumer login OK:", consumer.display_name, consumer.role)

    print("Testing bad password...")
    bad_login = auth_service.authenticate_user("citizen@gmail.com", "WrongPassword!")
    assert bad_login is None
    print("Bad password rejection OK.")

    print("Testing token creation and decoding...")
    token = create_access_token({"sub": officer.id, "email": officer.email, "role": officer.role.value})
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == officer.id
    assert payload["role"] == "OFFICER"
    print("JWT Token OK.")

    print("Testing complaint isolation...")
    officer_complaints = auth_service.get_complaints(officer)
    consumer_complaints = auth_service.get_complaints(consumer)
    assert len(officer_complaints) >= 2
    assert len(consumer_complaints) == 2
    print(f"Complaints count: Officer sees {len(officer_complaints)}, Consumer sees {len(consumer_complaints)}")

    # Add new complaint as consumer
    new_c = auth_service.create_complaint(consumer, ComplaintCreate(
        product_name="Test Product 500g",
        issue_category="missing_care",
        description="Missing customer care",
        contact_email="citizen@gmail.com"
    ))
    assert new_c.id.startswith("CMP-")
    assert len(auth_service.get_complaints(consumer)) == 3
    print("New complaint creation OK:", new_c.id)

    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_auth()
