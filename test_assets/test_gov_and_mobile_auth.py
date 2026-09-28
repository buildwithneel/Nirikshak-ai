import pytest
from backend.auth.security import determine_role_from_email, get_officer_domains
from backend.auth.models import UserRole
from backend.auth.service import auth_service

def test_gov_com_officer_role():
    assert "gov.com" in get_officer_domains()
    assert determine_role_from_email("officer@gov.com") == UserRole.OFFICER
    assert determine_role_from_email("admin@gov.com") == UserRole.OFFICER
    assert determine_role_from_email("director.legal@gov.com") == UserRole.OFFICER
    assert determine_role_from_email("officer@state.gov.com") == UserRole.OFFICER

def test_normal_civilian_roles():
    assert determine_role_from_email("citizen@gmail.com") == UserRole.USER
    assert determine_role_from_email("user@yahoo.com") == UserRole.USER
    assert determine_role_from_email("someone@outlook.com") == UserRole.USER

def test_mobile_user_provisioning_and_first_login():
    phone = "+91 99887 76655"
    user, is_first = auth_service.authenticate_mobile_user(phone)
    assert user.role == UserRole.USER
    assert is_first is True

    # Update profile on first login with civilian's full name
    updated = auth_service.update_user_profile(user.id, display_name="Amitabh Joshi")
    assert updated.display_name == "Amitabh Joshi"
    assert updated.is_first_login is False

    # Subsequent login recognizes user
    user2, is_first2 = auth_service.authenticate_mobile_user(phone)
    assert user2.display_name == "Amitabh Joshi"
    assert is_first2 is False
