from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user, require_roles
from ..models import RoleEnum, User
from ..schemas import (
    TestCaseCreate,
    TestCaseOut,
    TestCaseUpdate,
    TestGenerationRequest,
    TestRunRequest,
    TestRunOut,
    TestSuiteOut,
)
from ..services import test_cases as svc

router = APIRouter(prefix="/tests", tags=["tests"])


@router.get("/{prompt_name}", response_model=TestSuiteOut)
def get_suite(
    prompt_name: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        cases, runs, prompt = svc.list_suite(db, prompt_name, user)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))

    return TestSuiteOut(
        cases=cases,
        runs=runs,
        prompt_version=prompt.version,
        prompt_template=prompt.template,
        prompt_variables=prompt.variables or [],
    )


@router.post(
    "/{prompt_name}",
    response_model=TestCaseOut,
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))],
)
def create_case(
    prompt_name: str,
    payload: TestCaseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        case = svc.create_test_case(db, prompt_name, payload, user)
        return case
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))


@router.patch(
    "/cases/{case_id}",
    response_model=TestCaseOut,
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))],
)
def update_case(
    case_id: int,
    payload: TestCaseUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        return svc.update_test_case(db, case_id, payload, user)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))


@router.delete(
    "/cases/{case_id}",
    status_code=204,
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))],
)
def delete_case(
    case_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        svc.delete_test_case(db, case_id, user)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    return None


@router.post(
    "/{prompt_name}/generate",
    response_model=List[TestCaseOut],
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))],
)
def generate_cases(
    prompt_name: str,
    payload: TestGenerationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        cases = svc.generate_test_cases(db, prompt_name, payload.count, user)
        return cases
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post(
    "/{prompt_name}/run",
    response_model=List[TestRunOut],
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))],
)
def run_tests(
    prompt_name: str,
    payload: TestRunRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        runs = svc.run_tests(db, prompt_name, payload, user)
        return runs
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
