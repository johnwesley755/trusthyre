from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import verify_internal_api_key

DBSessionDep = Annotated[AsyncSession, Depends(get_db)]
AuthSecretDep = Annotated[bool, Depends(verify_internal_api_key)]
