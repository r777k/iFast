import os
import json
from pydantic import BaseModel, Field
from typing import Optional
from groq import Groq

# The Groq client automatically picks up the GROQ_API_KEY environment variable.
groq_client = Groq()

# --- STAGE 1: LLM Extraction Schema ---
class IntakeExtraction(BaseModel):
    item_name: str
    brand: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    preparation: Optional[str] = None
    user_stated_calories_kcal: Optional[float] = None
    llm_estimated_calories_kcal: Optional[float] = None  # NEW: Allow the LLM to guess common items
    likely_has_calories: str
    needs_clarification: bool
    clarification_question: Optional[str] = None

SYSTEM_PROMPT = """
You extract snack-intake details for a fasting tracker application.

CRITICAL INSTRUCTIONS:
1. DO NOT be overly pedantic. Do not ask for the brand of common items (like milk, tea, coffee, generic biscuits, or Oreos, rusk, bun, kakra, samosa, puff, laddu, indian sweets, indian snacks, fruits). Assume generic nutritional values for common foods.
2. If the user provides multiple items (e.g., "1 cup milk tea and 2 biscuits"), combine EVERYTHING (including quantities) into the 'item_name' string so context is not lost.
3. Only set 'needs_clarification' to true if the item is completely ambiguous (e.g., "I had a snack") or if a very high-calorie item is completely missing its portion size.
4. Provide a rough estimate in 'llm_estimated_calories_kcal' for common items if the user doesn't state it. 
5. You must return exactly ONE JSON object. DO NOT return a list or array.

You must respond in valid JSON format matching this exact structure:
{
  "item_name": "string",
  "brand": "string or null",
  "quantity": "number or null",
  "unit": "string or null",
  "preparation": "string or null",
  "user_stated_calories_kcal": "number or null",
  "llm_estimated_calories_kcal": "number or null",
  "likely_has_calories": "yes, no, or unknown",
  "needs_clarification": "boolean",
  "clarification_question": "string or null"
}
"""

def extract_intake_with_llm(user_text: str) -> IntakeExtraction:
    response = groq_client.chat.completions.create(
        # Update the model string here:
        model="openai/gpt-oss-20b", 
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_text}
        ],
        response_format={"type": "json_object"},
        temperature=0.0
    )
    
    raw_json = response.choices[0].message.content
    data = json.loads(raw_json)
    
    # Safety catch: If the LLM still returns a list, grab the first element
    if isinstance(data, list):
        data = data[0] if len(data) > 0 else {}
        
    return IntakeExtraction(**data)


# --- STAGE 2: Nutrition Resolution ---
class Nutrition(BaseModel):
    calories_kcal: Optional[float]
    carbs_g: Optional[float]
    protein_g: Optional[float]
    fat_g: Optional[float]
    confidence: float

def resolve_nutrition(extraction: IntakeExtraction) -> Nutrition:
    item = extraction.item_name.lower()
    prep = (extraction.preparation or "").lower()
    
    # 1. Trust explicitly stated calories
    if extraction.user_stated_calories_kcal is not None:
        return Nutrition(
            calories_kcal=extraction.user_stated_calories_kcal,
            carbs_g=0.0, protein_g=0.0, fat_g=0.0, confidence=0.95
        )

    # 2. Strict Plain Zero-Calorie Checks
    if extraction.likely_has_calories == "no" and ("water" in item or "black coffee" in item or "plain tea" in item):
        return Nutrition(calories_kcal=0.0, carbs_g=0, protein_g=0, fat_g=0, confidence=0.95)
    
    # 3. Explicit low-calorie items
    if "mint" in item and ("sugar-free" in prep or "sugar free" in item):
        return Nutrition(calories_kcal=2.0, carbs_g=0.5, protein_g=0, fat_g=0, confidence=0.90)
        
    # 4. Fallback to the LLM's estimate for common foods (e.g., Oreos, Milk Tea)
    if extraction.llm_estimated_calories_kcal is not None:
        # We assign 0.85 confidence so it passes the 0.80 threshold, but leaves room for future DB lookups
        return Nutrition(
            calories_kcal=extraction.llm_estimated_calories_kcal,
            carbs_g=0.0, protein_g=0.0, fat_g=0.0, confidence=0.85
        )
    
    # 5. Ambiguous/Unknown
    return Nutrition(calories_kcal=None, carbs_g=None, protein_g=None, fat_g=None, confidence=0.40)


# --- STAGE 3: Deterministic Policy Check ---
def assess_intake(nutrition: Nutrition, mode: str) -> dict:
    if nutrition.calories_kcal is None or nutrition.confidence < 0.80:
        return {
            "decision": "needs_confirmation",
            "reason_code": "NUTRITION_UNCERTAIN",
            "message": "I can’t confirm the nutrition reliably enough to say whether your fast is unaffected.",
            "needs_user_input": "Please provide a rough estimate of the calories, or scan the label."
        }

    if mode == "clean":
        if nutrition.calories_kcal > 0:
            return {
                "decision": "break_fast",
                "reason_code": "CLEAN_FAST_CALORIES",
                "message": "This contains calories, so it ends a clean fast under your selected policy."
            }
        return {
            "decision": "continue",
            "reason_code": "ZERO_CALORIE",
            "message": "No meaningful caloric intake detected. You can continue your clean fast."
        }

    cal = nutrition.calories_kcal
    if cal < 10:
        return {
            "decision": "continue",
            "reason_code": "PRACTICAL_THRESHOLD_NOT_EXCEEDED",
            "estimated_calories_kcal": cal,
            "message": f"This is estimated at {cal:.0f} kcal. Under your practical-fasting setting (<10 kcal), you can continue."
        }

    return {
        "decision": "break_fast",
        "reason_code": "PRACTICAL_THRESHOLD_EXCEEDED",
        "estimated_calories_kcal": cal,
        "message": f"This is estimated at {cal:.0f} kcal, which exceeds your practical threshold. Log it and end the current fast."
    }

def evaluate_midfast_intake(user_text: str, mode: str = "practical") -> dict:
    ext = extract_intake_with_llm(user_text)

    if ext.needs_clarification:
        return {
            "decision": "needs_confirmation",
            "reason_code": "AMBIGUOUS_INTAKE",
            "message": "I need one detail before I can assess this intake.",
            "needs_user_input": ext.clarification_question or "Could you clarify the exact amount and preparation?",
            "extracted": ext.model_dump()
        }

    nutrition = resolve_nutrition(ext)
    assessment = assess_intake(nutrition, mode)
    assessment["extracted"] = ext.model_dump()
    
    return assessment