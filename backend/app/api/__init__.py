from fastapi import APIRouter
from app.api.upload import router as upload_router
from app.api.dashboard import router as dashboard_router
from app.api.observations import router as observations_router
from app.api.datasets import router as datasets_router

api_router = APIRouter()
api_router.include_router(upload_router)
api_router.include_router(dashboard_router)
api_router.include_router(observations_router)
api_router.include_router(datasets_router)
