from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine, SessionLocal
from .auth import ensure_admin_seed
from .routers import auth as auth_router
from .routers import prompts as prompts_router
from .routers import deployments as deployments_router
from .routers import ab as ab_router
from .routers import usage as usage_router
from .routers import kpis as kpis_router


def create_app() -> FastAPI:
    app = FastAPI(title="prompt-version-hub", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Initialize DB
    Base.metadata.create_all(bind=engine)
    # Ensure default admin exists
    with SessionLocal() as db:
        ensure_admin_seed(db)

    app.include_router(auth_router.router)
    app.include_router(prompts_router.router)
    app.include_router(deployments_router.router)
    app.include_router(ab_router.router)
    app.include_router(usage_router.router)
    app.include_router(kpis_router.router)

    @app.get("/")
    def root():
        return {"status": "ok"}

    return app


app = create_app()

