from fastapi import APIRouter
from app.api.routes.auth import router as auth_router
from app.api.routes.data_sources import router as data_sources_router
from app.api.routes.health import router as health_router
from app.api.routes.root import router as root_router
from app.api.routes.query import router as query_router
from app.api.routes.observability import router as observability_router


api_router = APIRouter()

api_router.include_router(data_sources_router)
api_router.include_router(root_router)
api_router.include_router(health_router)
api_router.include_router(query_router)
api_router.include_router(observability_router)
api_router.include_router(auth_router)