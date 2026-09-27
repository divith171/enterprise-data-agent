from unittest.mock import AsyncMock
import os
import pytest
os.environ.setdefault(
    "OPENAI_API_KEY",
    "test-openai-key",
)

os.environ.setdefault(
    "ANTHROPIC_API_KEY",
    "test-anthropic-key",
)
from services import capability_validator_service


class FakeState:
    def to_dict(self):
        return {}


@pytest.mark.asyncio
async def test_capability_validator_preserves_valid_feasible_response(
    monkeypatch,
):
    monkeypatch.setattr(
        capability_validator_service,
        "generate_response",
        AsyncMock(
            return_value='''
            {
                "feasible": true,
                "reason": "Supported by schema",
                "missing_requirements": []
            }
            '''
        ),
    )

    result = await capability_validator_service.validate_analytical_capability(
        user_question="Count customers",
        state=FakeState(),
        schema={"customers": ["customer_id"]},
    )

    assert result["feasible"] is True


@pytest.mark.asyncio
async def test_capability_validator_fails_closed_on_malformed_json(
    monkeypatch,
):
    monkeypatch.setattr(
        capability_validator_service,
        "generate_response",
        AsyncMock(
            return_value="THIS IS NOT VALID JSON"
        ),
    )

    result = await capability_validator_service.validate_analytical_capability(
        user_question="Do something",
        state=FakeState(),
        schema={},
    )

    assert result["feasible"] is False


@pytest.mark.asyncio
async def test_capability_validator_fails_closed_when_feasible_missing(
    monkeypatch,
):
    monkeypatch.setattr(
        capability_validator_service,
        "generate_response",
        AsyncMock(
            return_value='''
            {
                "reason": "Unknown",
                "missing_requirements": []
            }
            '''
        ),
    )

    result = await capability_validator_service.validate_analytical_capability(
        user_question="Do something",
        state=FakeState(),
        schema={},
    )

    assert result["feasible"] is False


@pytest.mark.asyncio
async def test_capability_validator_fails_closed_when_feasible_wrong_type(
    monkeypatch,
):
    monkeypatch.setattr(
        capability_validator_service,
        "generate_response",
        AsyncMock(
            return_value='''
            {
                "feasible": "yes",
                "reason": "Invalid shape",
                "missing_requirements": []
            }
            '''
        ),
    )

    result = await capability_validator_service.validate_analytical_capability(
        user_question="Do something",
        state=FakeState(),
        schema={},
    )

    assert result["feasible"] is False