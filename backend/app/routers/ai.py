from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..auth import get_current_user
from ..database import get_db
from ..schemas.ai import PromptGenerationRequest, PromptGenerationResponse
from ..services.ai import ai_service
from ..models import AIGeneration
from ..config import settings
from ..rate_limiter import limiter


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/generate-prompt", response_model=PromptGenerationResponse)
@limiter.limit(settings.ai_rate_limit_per_ip)
def generate_prompt(
    request: Request,
    payload: PromptGenerationRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a professional prompt template using AI.

    This endpoint uses Google Gemini 2.5 Flash to create optimized, production-ready prompts
    based on user specifications. The generated prompts include:
    - Clear structure and instructions
    - Dynamic variables in {{variable_name}} format
    - Best practices for prompt engineering
    - Metadata and improvement suggestions

    **Authentication Required**: Yes

    **Request Body**:
    - `goal` (required): Main objective of the prompt (10-1000 chars)
    - `industry`: Industry or domain (optional)
    - `target_audience`: Target audience (optional)
    - `tone`: Desired tone - professional, casual, friendly, technical, creative, formal
    - `output_format`: Expected format - text, json, markdown, html, code, list
    - `context`: Additional context (optional, max 2000 chars)
    - `constraints`: Constraints or limitations (optional, max 1000 chars)
    - `examples`: Example inputs/outputs (optional, max 2000 chars)

    **Response**:
    - `prompt_template`: The generated prompt ready to use
    - `variables`: List of detected variables (e.g., ["user_name", "product_id"])
    - `metadata`: Statistics about the prompt (char count, word count, complexity)
    - `suggestions`: List of improvement suggestions

    **Example Usage**:
    ```json
    {
      "goal": "Generate product descriptions for e-commerce",
      "industry": "Fashion",
      "tone": "professional",
      "output_format": "text",
      "constraints": "Max 200 words, highlight key features"
    }
    ```

    **Rate Limits**:
    - Recommended: Max 50 requests per day per user
    - This endpoint calls an external AI API which incurs costs

    **Errors**:
    - 401: Unauthorized (missing or invalid token)
    - 422: Validation error (invalid request data)
    - 500: AI service error (API failure, rate limits, etc.)
    """
    try:
        daily_limit = settings.ai_max_requests_per_user_per_day
        if daily_limit > 0:
            window_start = datetime.now(timezone.utc) - timedelta(days=1)
            usage_count = (
                db.query(AIGeneration)
                .filter(
                    AIGeneration.user_id == user.id,
                    AIGeneration.created_at >= window_start,
                )
                .count()
            )
            if usage_count >= daily_limit:
                raise HTTPException(
                    status_code=429,
                    detail=f"Daily AI generation limit reached ({daily_limit} requests). Please try again later.",
                )

        result = ai_service.generate_prompt(
            payload,
            db=db,
            user_id=user.id,
        )
        return result
    except ValueError as e:
        # Configuration errors (e.g., missing API key)
        raise HTTPException(
            status_code=500,
            detail=f"AI service configuration error: {str(e)}"
        )
    except RuntimeError as e:
        # API call errors
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate prompt: {str(e)}"
        )
    except Exception as e:
        # Unexpected errors
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )
