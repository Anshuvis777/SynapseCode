"""
Unit tests for security utilities — password hashing and JWT.
"""

import pytest
import jwt

from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.config import settings


# ── Password tests ──────────────────────────────────────────────

def test_hash_password_produces_bcrypt_hash():
    hashed = hash_password("secret123")
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert hashed != "secret123"


def test_verify_password_correct():
    hashed = hash_password("correct_password")
    assert verify_password("correct_password", hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("correct_password")
    assert verify_password("wrong_password", hashed) is False


# ── JWT tests ───────────────────────────────────────────────────

def test_access_token_contains_correct_claims():
    token = create_access_token("user-123", "user@test.com")
    payload = decode_token(token)
    assert payload["sub"] == "user-123"
    assert payload["email"] == "user@test.com"
    assert payload["type"] == "access"


def test_refresh_token_contains_correct_claims():
    token = create_refresh_token("user-123")
    payload = decode_token(token)
    assert payload["sub"] == "user-123"
    assert payload["type"] == "refresh"
    assert "email" not in payload


def test_decode_invalid_token_raises():
    with pytest.raises(jwt.InvalidTokenError):
        decode_token("not.a.valid.token")


def test_decode_tampered_token_raises():
    token = create_access_token("user-123", "user@test.com")
    tampered = token[:-5] + "XXXXX"
    with pytest.raises(jwt.InvalidTokenError):
        decode_token(tampered)
