from fastapi import APIRouter

from observability.metrics import compute_metrics


router = APIRouter()


@router.get("/observability/overview")
async def observability_overview():
    return compute_metrics()