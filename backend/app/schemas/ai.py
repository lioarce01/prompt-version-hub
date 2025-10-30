from pydantic import BaseModel, Field
from typing import Optional, Literal

ToneEnum = Literal["professional", "casual", "friendly", "technical", "creative", "formal"]
OutputFormatEnum = Literal["text", "json", "markdown", "html", "code", "list"]


class PromptGenerationRequest(BaseModel):
    goal: str = Field(..., min_length=10, max_length=1000, description="Main objective of the prompt")
    industry: Optional[str] = Field(None, max_length=100, description="Industry or domain")
    target_audience: Optional[str] = Field(None, max_length=200, description="Target audience")
    tone: ToneEnum = Field(default="professional", description="Desired tone/style")
    output_format: OutputFormatEnum = Field(default="text", description="Expected output format")
    context: Optional[str] = Field(None, max_length=2000, description="Additional context")
    constraints: Optional[str] = Field(None, max_length=1000, description="Constraints or limitations")
    examples: Optional[str] = Field(None, max_length=2000, description="Example inputs/outputs")


class PromptGenerationMetadata(BaseModel):
    char_count: int
    word_count: int
    line_count: int
    complexity: Literal["simple", "medium", "complex"]


class PromptGenerationResponse(BaseModel):
    prompt_template: str = Field(..., description="Generated prompt template")
    variables: list[str] = Field(..., description="Detected variables in template")
    metadata: PromptGenerationMetadata = Field(..., description="Additional metadata")
    suggestions: list[str] = Field(default_factory=list, description="Improvement suggestions")
