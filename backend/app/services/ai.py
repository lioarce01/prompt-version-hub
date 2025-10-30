import logging
import re
from typing import Any, Dict, Optional
import google.generativeai as genai
from sqlalchemy.orm import Session
from ..schemas.ai import (
    PromptGenerationRequest,
    PromptGenerationResponse,
    PromptGenerationMetadata,
)
from ..models import AIGeneration
from ..config import settings


logger = logging.getLogger(__name__)


class AIService:
    def __init__(self):
        """Initialize AI service with Google Gemini client."""
        api_key = settings.google_genai_api_key
        if not api_key:
            raise ValueError("GOOGLE_GENAI_API_KEY environment variable not set")

        genai.configure(api_key=api_key)
        self.model = settings.google_genai_model or "gemini-2.5-flash"
        self.generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "max_output_tokens": 4000,
        }
        self.system_instruction = (
            "You are an expert prompt engineer specializing in creating production-ready AI prompts. "
            "You create clear, effective, and well-structured prompts that follow best practices."
        )
        self.client = genai.GenerativeModel(
            model_name=self.model,
            generation_config=self.generation_config,
            system_instruction=self.system_instruction,
        )

    def generate_prompt(
        self,
        request: PromptGenerationRequest,
        *,
        db: Session,
        user_id: int,
    ) -> PromptGenerationResponse:
        """
        Generate a professional prompt template using Google Gemini.

        Args:
            request: The prompt generation request with all specifications

        Returns:
            PromptGenerationResponse with the generated template and metadata
        """
        # Build meta-prompt for Gemini
        meta_prompt = self._build_meta_prompt(request)

        # Call Gemini API
        generated_template, raw_response = self._call_gemini_api(meta_prompt)
        usage = self._extract_usage_metadata(raw_response)

        # Extract variables from the template
        variables = self._extract_variables(generated_template)

        # Calculate metadata
        metadata = self._calculate_metadata(generated_template)

        # Generate improvement suggestions
        suggestions = self._generate_suggestions(request, generated_template)

        result = PromptGenerationResponse(
            prompt_template=generated_template,
            variables=variables,
            metadata=metadata,
            suggestions=suggestions,
        )

        # Persist usage for analytics/tracking (best-effort)
        self._log_generation(
            db=db,
            user_id=user_id,
            request=request,
            response=result,
            usage=usage,
        )

        return result

    def _build_meta_prompt(self, req: PromptGenerationRequest) -> str:
        """
        Build the meta-prompt that will be sent to Gemini to generate the user's prompt.
        """
        meta_prompt = f"""You are an expert prompt engineer specializing in creating production-ready AI prompts. Your task is to create a professional, well-structured prompt template based on the following specifications:

**Primary Goal**: {req.goal}
"""

        if req.industry:
            meta_prompt += f"\n**Industry/Domain**: {req.industry}"

        if req.target_audience:
            meta_prompt += f"\n**Target Audience**: {req.target_audience}"

        meta_prompt += f"\n**Desired Tone**: {req.tone}"
        meta_prompt += f"\n**Expected Output Format**: {req.output_format}"

        if req.context:
            meta_prompt += f"\n\n**Additional Context**:\n{req.context}"

        if req.constraints:
            meta_prompt += f"\n\n**Constraints and Limitations**:\n{req.constraints}"

        if req.examples:
            meta_prompt += f"\n\n**Example Inputs/Outputs**:\n{req.examples}"

        meta_prompt += """

**Your Task**:
Generate a professional, production-ready prompt template that:

1. Is clear, specific, and actionable
2. Includes dynamic variables in {{variable_name}} format (e.g., {{product_name}}, {{user_input}})
3. Follows best practices for prompt engineering:
   - Clear role definition
   - Specific instructions
   - Output format specification
   - Examples if beneficial
   - Edge case handling
4. Is well-structured with clear sections (you can use markdown formatting)
5. Is optimized for the specified output format and tone
6. Includes appropriate context and constraints
7. Is comprehensive enough to produce consistent, high-quality outputs

**Important Guidelines**:
- Use {{variable_name}} syntax for any dynamic content that should be filled in at runtime
- Make the prompt self-contained and clear
- Include instructions on how to handle edge cases or missing information
- Ensure the tone matches the specification ({req.tone})
- Format the output instructions to match the desired format ({req.output_format})

Provide ONLY the prompt template itself, with no additional commentary, explanations, or meta-text. The template should be ready to use as-is."""

        return meta_prompt

    def _call_gemini_api(self, meta_prompt: str) -> tuple[str, Any]:
        """
        Call Gemini API to generate the prompt template.

        Args:
            meta_prompt: The meta-prompt instructing Gemini how to generate the user's prompt

        Returns:
            Tuple containing the generated prompt template and the raw API response
        """
        try:
            response = self.client.generate_content(
                meta_prompt,
            )

            text = getattr(response, "text", None)
            if not text and hasattr(response, "candidates") and response.candidates:
                parts = response.candidates[0].content.parts
                text = "".join(
                    part.text for part in parts if hasattr(part, "text") and part.text
                )

            if not text:
                raise RuntimeError("Gemini API returned no text content")

            return text, response

        except Exception as e:
            raise RuntimeError(f"Failed to call Gemini API: {str(e)}")

    def _extract_usage_metadata(self, raw_response: Any) -> Dict[str, Any]:
        """
        Extract usage metadata from the Gemini response, if available.
        """
        usage = getattr(raw_response, "usage_metadata", None)
        if usage is None:
            return {}

        # Some SDK versions expose usage as dataclass-like objects
        usage_dict = {}
        for field in ("prompt_token_count", "candidates_token_count", "total_token_count"):
            value = getattr(usage, field, None)
            if value is not None:
                usage_dict[field] = value

        if not usage_dict and isinstance(usage, dict):
            usage_dict = usage

        return usage_dict

    def _log_generation(
        self,
        *,
        db: Session,
        user_id: int,
        request: PromptGenerationRequest,
        response: PromptGenerationResponse,
        usage: Dict[str, Any],
    ) -> None:
        """
        Persist AI generation metadata for tracking and analytics. Best-effort: failures are logged but don't block the response.
        """
        try:
            record = AIGeneration(
                user_id=user_id,
                request_data=request.model_dump(),
                response_data=response.model_dump(),
                prompt_template=response.prompt_template,
                variables=response.variables,
                ai_provider="google_gemini",
                ai_model=self.model,
                tokens_used=usage.get("total_token_count"),
                cost_cents=self._estimate_cost_cents(usage),
            )
            db.add(record)
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Failed to persist AI generation record")

    def _estimate_cost_cents(self, usage: Dict[str, Any]) -> Optional[int]:
        """
        Estimate the cost in cents for the generation. Currently returns None (requires pricing integration).
        """
        return None

    def _extract_variables(self, template: str) -> list[str]:
        """
        Extract variables in {{variable_name}} format from the template.

        Args:
            template: The generated prompt template

        Returns:
            List of unique variable names found in the template
        """
        pattern = r'\{\{(\w+)\}\}'
        matches = re.findall(pattern, template)
        return list(set(matches))  # Remove duplicates and return as list

    def _calculate_metadata(self, template: str) -> PromptGenerationMetadata:
        """
        Calculate metadata about the generated template.

        Args:
            template: The generated prompt template

        Returns:
            PromptGenerationMetadata object with statistics
        """
        char_count = len(template)
        word_count = len(template.split())
        line_count = len(template.split('\n'))
        complexity = self._assess_complexity(word_count)

        return PromptGenerationMetadata(
            char_count=char_count,
            word_count=word_count,
            line_count=line_count,
            complexity=complexity,
        )

    def _assess_complexity(self, word_count: int) -> str:
        """
        Assess the complexity of the template based on word count.

        Args:
            word_count: Number of words in the template

        Returns:
            Complexity level: "simple", "medium", or "complex"
        """
        if word_count < 50:
            return "simple"
        elif word_count < 150:
            return "medium"
        else:
            return "complex"

    def _generate_suggestions(
        self, req: PromptGenerationRequest, template: str
    ) -> list[str]:
        """
        Generate improvement suggestions based on the request and generated template.

        Args:
            req: The original request
            template: The generated template

        Returns:
            List of suggestion strings
        """
        suggestions = []

        # Check if examples were provided
        if not req.examples:
            suggestions.append(
                "Consider adding example inputs/outputs for better AI understanding and consistency"
            )

        # Check if constraints were provided
        if not req.constraints:
            suggestions.append(
                "You might want to add constraints like max word count, forbidden topics, or specific requirements"
            )

        # Check for variables
        variables = self._extract_variables(template)
        if len(variables) == 0:
            suggestions.append(
                "No dynamic variables detected. Consider making the prompt more flexible with {{variables}}"
            )
        elif len(variables) > 10:
            suggestions.append(
                "This prompt has many variables. Consider if all are necessary or if some can be combined"
            )

        # Check template length
        if len(template) > 2500:
            suggestions.append(
                "This prompt is quite long. Consider splitting it into multiple specialized prompts for better maintainability"
            )
        elif len(template) < 100:
            suggestions.append(
                "This prompt is very short. Consider adding more context or examples for better results"
            )

        # Check if context was provided for complex goals
        if len(req.goal) > 200 and not req.context:
            suggestions.append(
                "For complex goals, providing additional context can significantly improve the prompt quality"
            )

        # Industry-specific suggestion
        if not req.industry and not req.target_audience:
            suggestions.append(
                "Specifying an industry or target audience can help create more tailored prompts"
            )

        return suggestions


# Singleton instance
ai_service = AIService()
