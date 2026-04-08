import json

from app.services.ingestion import build_ingestion_plan


def main() -> None:
    plan = build_ingestion_plan()
    print(json.dumps(plan, indent=2))


if __name__ == "__main__":
    main()

