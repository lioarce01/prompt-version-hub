from __future__ import annotations

import json
import logging
from typing import List, Optional, Tuple

import google.generativeai as genai
from sqlalchemy.orm import Session

from ..config import settings
from ..models import (
    Prompt,
    TestCase,
    TestRun,
    TestCategoryEnum,
    User,
    RoleEnum,
)
from ..schemas import (
    TestCaseCreate,
    TestCaseUpdate,
    TestRunRequest,
)

logger = logging.getLogger(__name__)


def _configure_genai() -> None:
    if not settings.google_genai_api_key:
        raise ValueError("GOOGLE_GENAI_API_KEY environment variable not set")
    genai.configure(api_key=settings.google_genai_api_key)


def _require_prompt_by_name(db: Session, prompt_name: str) -> Prompt:
    prompt = (
        db.query(Prompt)
        .filter(Prompt.name == prompt_name, Prompt.active == True)
        .order_by(Prompt.version.desc())
        .first()
    )
    if not prompt:
        prompt = (
            db.query(Prompt)
            .filter(Prompt.name == prompt_name)
            .order_by(Prompt.version.desc())
            .first()
        )
    if not prompt:
        raise LookupError("Prompt not found")
    return prompt


def _require_prompt_owner(db: Session, prompt_name: str, user: User) -> Prompt:
    prompt = _require_prompt_by_name(db, prompt_name)
    if user.role != RoleEnum.admin and prompt.created_by != user.id:
        raise PermissionError("Only the prompt owner can manage test cases")
    return prompt


def _require_test_case(db: Session, case_id: int) -> TestCase:
    case = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not case:
        raise LookupError("Test case not found")
    return case


def list_suite(db: Session, prompt_name: str, viewer: User) -> Tuple[List[TestCase], List[TestRun], Prompt]:
    prompt = _require_prompt_by_name(db, prompt_name)
    if prompt.created_by != viewer.id and viewer.role != RoleEnum.admin and not prompt.is_public:
        raise PermissionError("You do not have access to this prompt")

    cases = (
        db.query(TestCase)
        .filter(TestCase.prompt_id == prompt.id)
        .order_by(TestCase.created_at.desc())
        .all()
    )
    runs = (
        db.query(TestRun)
        .filter(TestRun.prompt_id == prompt.id)
        .order_by(TestRun.executed_at.desc())
        .limit(50)
        .all()
    )
    return cases, runs, prompt


def create_test_case(db: Session, prompt_name: str, payload: TestCaseCreate, user: User) -> TestCase:
    prompt = _require_prompt_owner(db, prompt_name, user)
    case = TestCase(
        prompt_id=prompt.id,
        name=payload.name,
        input_text=payload.input_text,
        expected_output=payload.expected_output,
        category=payload.category,
        auto_generated=payload.auto_generated,
        created_by=user.id,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


def update_test_case(db: Session, case_id: int, payload: TestCaseUpdate, user: User) -> TestCase:
    case = _require_test_case(db, case_id)
    prompt = db.query(Prompt).filter(Prompt.id == case.prompt_id).first()
    if not prompt:
        raise LookupError("Prompt not found for test case")
    if user.role != RoleEnum.admin and prompt.created_by != user.id:
        raise PermissionError("Only the prompt owner can update this test case")

    if payload.name is not None:
        case.name = payload.name
    if payload.input_text is not None:
        case.input_text = payload.input_text
    if payload.expected_output is not None:
        case.expected_output = payload.expected_output
    if payload.category is not None:
        case.category = payload.category

    db.commit()
    db.refresh(case)
    return case


def delete_test_case(db: Session, case_id: int, user: User) -> None:
    case = _require_test_case(db, case_id)
    prompt = db.query(Prompt).filter(Prompt.id == case.prompt_id).first()
    if not prompt:
        raise LookupError("Prompt not found for test case")
    if user.role != RoleEnum.admin and prompt.created_by != user.id:
        raise PermissionError("Only the prompt owner can delete this test case")

    db.delete(case)
    db.commit()


def generate_test_cases(db: Session, prompt_name: str, count: int, user: User) -> List[TestCase]:
    prompt = _require_prompt_owner(db, prompt_name, user)
    _configure_genai()

    model = genai.GenerativeModel(
        model_name=settings.google_genai_model or "gemini-2.5-flash",
        generation_config={
            "temperature": 0.4,
            "top_p": 0.9,
            "top_k": 40,
            "max_output_tokens": 2048,
        },
    )

    variables = prompt.variables or []
    instructions = "\n".join(
        [
            "You are an QA engineer for prompt-based systems.",
            "Generate diverse, well-structured JSON test cases for the given prompt template.",
            "Each test case must include: name, category, input (object keyed by variable), expected_output.",
            "Categories must be one of: happy_path, edge_case, boundary, negative.",
            "Return strictly valid JSON array.",
        ]
    )

    prompt_text = f"""{instructions}

PROMPT TEMPLATE:
{prompt.template}

VARIABLES: {', '.join(variables) if variables else 'none'}

NUMBER OF TEST CASES: {count}
"""

    response = model.generate_content(prompt_text)
    raw_text = response.text if hasattr(response, "text") else None
    if not raw_text:
        raise RuntimeError("AI provider did not return any content")

    try:
        parsed = json.loads(raw_text)
        if not isinstance(parsed, list):
            raise ValueError("AI response is not a JSON array")
    except json.JSONDecodeError as exc:
        logger.exception("Failed to parse AI response: %s", raw_text)
        raise RuntimeError("Failed to parse AI generated test cases") from exc

    created_cases: List[TestCase] = []
    for item in parsed:
        try:
            case_name = item.get("name") or "AI generated case"
            inputs = item.get("input") or item.get("inputs") or {}
            expected_output = item.get("expected_output") or item.get("expected_behavior")
            category_value = item.get("category", "happy_path")
            category = TestCategoryEnum(category_value)
            input_text = json.dumps(inputs, ensure_ascii=False) if isinstance(inputs, (dict, list)) else str(inputs)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Skipping malformed test case payload: %s (%s)", item, exc)
            continue

        case = TestCase(
            prompt_id=prompt.id,
            name=case_name,
            input_text=input_text,
            expected_output=expected_output,
            category=category,
            auto_generated=True,
            created_by=user.id,
        )
        db.add(case)
        created_cases.append(case)

    db.commit()
    for case in created_cases:
        db.refresh(case)
    return created_cases


def _serialize_input(input_text: str) -> dict:
    try:
        return json.loads(input_text)
    except json.JSONDecodeError:
        return {"input": input_text}


def _build_prompt_execution_input(prompt_template: str, variable_map: dict) -> str:
    text = prompt_template
    for key, value in variable_map.items():
        placeholder = "{{" + key + "}}"
        text = text.replace(placeholder, str(value))
    return text


def run_tests(db: Session, prompt_name: str, payload: TestRunRequest, user: User) -> List[TestRun]:
    prompt = _require_prompt_owner(db, prompt_name, user)
    case_query = db.query(TestCase).filter(TestCase.prompt_id == prompt.id)
    if payload.case_ids:
        case_query = case_query.filter(TestCase.id.in_(payload.case_ids))
    cases = case_query.all()
    if not cases:
        raise LookupError("No test cases found for execution")

    prompt_version = payload.prompt_version or prompt.version

    _configure_genai()
    model = genai.GenerativeModel(
        model_name=settings.google_genai_model or "gemini-2.5-flash",
        generation_config={
            "temperature": 0.2,
            "top_p": 0.95,
            "max_output_tokens": 1024,
        },
    )

    runs: List[TestRun] = []
    for case in cases:
        inputs = _serialize_input(case.input_text)
        filled_prompt = _build_prompt_execution_input(prompt.template, inputs)

        output_text: Optional[str] = None
        success: Optional[bool] = None
        latency_ms: Optional[int] = None
        tokens_used: Optional[int] = None
        cost_cents: Optional[int] = None
        error_message: Optional[str] = None
        try:
            response = model.generate_content(filled_prompt)
            output_text = response.text if hasattr(response, "text") else None
            if case.expected_output:
                success = output_text.strip() == case.expected_output.strip() if output_text else False
        except Exception as exc:  # pragma: no cover - external call
            logger.exception("Failed to execute test case %s: %s", case.id, exc)
            error_message = str(exc)
            success = False

        run = TestRun(
            prompt_id=prompt.id,
            prompt_version=prompt_version,
            test_case_id=case.id,
            input_text=case.input_text,
            output_text=output_text,
            success=success,
            latency_ms=latency_ms,
            tokens_used=tokens_used,
            cost_cents=cost_cents,
            error_message=error_message,
            executed_by=user.id,
        )
        db.add(run)
        runs.append(run)

    db.commit()
    for run in runs:
        db.refresh(run)
    return runs
