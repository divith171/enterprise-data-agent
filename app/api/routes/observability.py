from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from observability.metrics import compute_metrics


router = APIRouter()


@router.get("/observability/overview")
async def observability_overview(
    current_user=Depends(get_current_user),
):
    return compute_metrics(
        tenant_id=current_user["company_id"]
    )