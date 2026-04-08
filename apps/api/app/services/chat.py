import json

from openai import OpenAI

from app.core.config import settings
from app.models.schemas import ChatCard, ChatRequest, ChatResponse
from app.services.mock_data import get_region_detail, list_region_sentiment


def _region_snapshot(region: str | None) -> dict:
    if region:
        detail = get_region_detail(region)
        if detail:
            return detail

    points = list_region_sentiment()
    best_region = max(points, key=lambda item: item["sentiment_score"])
    return get_region_detail(best_region["region_code"]) or {
        "region_name": "Global",
        "summary": "No region snapshot available.",
        "sentiment_score": 0.0,
        "fear_score": 50.0,
        "momentum_score": 0.0,
        "top_topics": [],
    }


def _mock_chat_reply(request: ChatRequest) -> ChatResponse:
    snapshot = _region_snapshot(request.region)
    return ChatResponse(
        answer=(
            f"{snapshot['region_name']} currently has a sentiment score of "
            f"{snapshot['sentiment_score']:.2f} and a fear score of {snapshot['fear_score']:.0f}. "
            f"For a beginner investor, the main takeaway is to watch {', '.join(snapshot.get('top_topics', [])[:2]) or 'macro headlines'} "
            f"and avoid overreacting to a single article."
        ),
        mode="mock",
        region_focus=snapshot.get("region_code"),
        cards=[
            ChatCard(
                title="Region",
                value=snapshot["region_name"],
                detail=snapshot.get("summary", "No summary available."),
            ),
            ChatCard(
                title="Sentiment",
                value=f"{snapshot['sentiment_score']:.2f}",
                detail="Region-level weighted article sentiment.",
            ),
            ChatCard(
                title="Fear Score",
                value=f"{snapshot['fear_score']:.0f}",
                detail="0 is calm and 100 is highly risk-off.",
            ),
        ],
        used_tools=[],
    )


def generate_chat_reply(request: ChatRequest) -> ChatResponse:
    if not settings.openai_api_key:
        return _mock_chat_reply(request)

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        input_items: list = [{"role": "user", "content": request.message}]
        tools = [
            {
                "type": "function",
                "name": "get_region_snapshot",
                "description": "Get the latest regional market-intelligence snapshot for a given region code.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "region": {
                            "type": "string",
                            "description": "A slug like north-america, europe, asia-pacific, or latin-america.",
                        }
                    },
                    "required": ["region"],
                    "additionalProperties": False,
                },
                "strict": True,
            }
        ]

        response = client.responses.create(
            model=settings.openai_model,
            input=input_items,
            instructions=(
                "You are an AI market coach for beginner investors. Be concise, educational, and practical. "
                "Use the tool when the user asks about a region or market mood."
            ),
            tools=tools,
        )

        input_items.extend(response.output)
        used_tools: list[str] = []
        resolved_region = request.region

        for item in response.output:
            if item.type != "function_call":
                continue

            if item.name == "get_region_snapshot":
                args = json.loads(item.arguments)
                resolved_region = args.get("region")
                snapshot = _region_snapshot(resolved_region)
                used_tools.append(item.name)
                input_items.append(
                    {
                        "type": "function_call_output",
                        "call_id": item.call_id,
                        "output": json.dumps(snapshot),
                    }
                )

        if used_tools:
            response = client.responses.create(
                model=settings.openai_model,
                input=input_items,
                instructions=(
                    "Summarize the tool output for a beginner investor. Mention sentiment, fear, and one watch item."
                ),
                tools=tools,
            )

        snapshot = _region_snapshot(resolved_region)
        return ChatResponse(
            answer=response.output_text or _mock_chat_reply(request).answer,
            mode="openai",
            region_focus=snapshot.get("region_code"),
            cards=[
                ChatCard(
                    title="Region",
                    value=snapshot["region_name"],
                    detail=snapshot.get("summary", "No summary available."),
                ),
                ChatCard(
                    title="Sentiment",
                    value=f"{snapshot['sentiment_score']:.2f}",
                    detail="Region-level weighted article sentiment.",
                ),
                ChatCard(
                    title="Fear Score",
                    value=f"{snapshot['fear_score']:.0f}",
                    detail="0 is calm and 100 is highly risk-off.",
                ),
            ],
            used_tools=used_tools,
        )
    except Exception:
        return _mock_chat_reply(request)
