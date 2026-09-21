from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from api.config import settings
from api.database.connection import engine
from api.database.models import Base
from api.routers import auth, expenses, analytics, categories, groups, exports, users
from api.routers.categories import seed_system_categories
from api.database.connection import AsyncSessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await seed_system_categories(db)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = "/api"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(expenses.router, prefix=api_prefix)
app.include_router(analytics.router, prefix=api_prefix)
app.include_router(categories.router, prefix=api_prefix)
app.include_router(groups.router, prefix=api_prefix)
app.include_router(exports.router, prefix=api_prefix)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
