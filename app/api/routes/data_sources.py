from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user
from app.data_sources.service import list_data_sources_for_company


router = APIRouter()


@router.get("/data-sources")
async def list_data_sources(
    current_user=Depends(get_current_user),
):
    data_sources = await list_data_sources_for_company(
        current_user["company_id"]
    )

    return {
        "data_sources": [
            {
                "id": source[0],
                "name": source[2],
                "type": source[3],
                "host": source[4],
                "port": source[5],
                "database_name": source[6],
                "username": source[7],
                "ssl_mode": source[9],
                "is_active": source[10],
            }
            for source in data_sources
        ]
    }