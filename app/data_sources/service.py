from uuid import UUID
from app.auth.repository import get_data_source_by_id
from app.auth.repository import get_data_sources_by_company


async def list_data_sources_for_company(
    company_id: UUID,
):
    return await get_data_sources_by_company(company_id)

async def get_authorized_data_source(
    data_source_id: UUID,
    company_id: UUID,
):
    data_source = await get_data_source_by_id(data_source_id)

    if data_source is None:
        return None

    if data_source[1] != company_id:
        return None

    if not data_source[10]:
        return None

    return data_source