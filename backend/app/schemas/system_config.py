from typing import List, Optional
from pydantic import BaseModel
from app.schemas.user import ResponseModel


class ConfigBase(BaseModel):
    description: str
    key: str
    value: str
    type: str = "string"
    is_public: int = 0


class ConfigCreate(ConfigBase):
    pass


class ConfigUpdate(BaseModel):
    description: Optional[str] = None
    value: Optional[str] = None
    type: Optional[str] = None
    is_public: Optional[int] = None


class ConfigResponse(ConfigBase):
    id: int
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True


class ConfigListResponse(BaseModel):
    rows: List[ConfigResponse]
    total: int
    page: int
    page_size: int
