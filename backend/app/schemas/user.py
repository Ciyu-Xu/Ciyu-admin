from pydantic import BaseModel
from typing import Optional, List, Any


class LoginRequest(BaseModel):
    username: str
    password: str
    captcha: Optional[str] = None
    captcha_session_id: Optional[str] = None


class RegisterRequest(BaseModel):
    username: str
    password: str
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    captcha: Optional[str] = None
    captcha_session_id: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    code: int
    message: str
    data: TokenResponse


class UserBase(BaseModel):
    username: Optional[str] = None
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    status: Optional[int] = 1
    dept_id: Optional[int] = None


class ProfileUpdateRequest(BaseModel):
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None


class PasswordUpdateRequest(BaseModel):
    oldPassword: str
    newPassword: str


class UserCreate(UserBase):
    username: str
    password: Optional[str] = None
    role_ids: Optional[List[int]] = []
    post_ids: Optional[List[int]] = []


class UserUpdate(UserBase):
    password: Optional[str] = None
    role_ids: Optional[List[int]] = None
    post_ids: Optional[List[int]] = None


class UserResponse(BaseModel):
    id: int
    username: str
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    status: int = 1
    dept_id: Optional[int] = None
    create_time: Optional[str] = None
    update_time: Optional[str] = None
    
    class Config:
        from_attributes = True


class UserSimpleResponse(BaseModel):
    id: int
    username: str
    nickname: Optional[str] = None
    
    class Config:
        from_attributes = True


class UserQuery(BaseModel):
    username: Optional[str] = None
    nickname: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[int] = None
    dept_id: Optional[int] = None


class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str


class PasswordReset(BaseModel):
    user_id: int


class UserInfoData(BaseModel):
    id: int
    username: str
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    roles: List[str] = []
    permissions: List[str] = []


class UserInfoResponse(BaseModel):
    code: int
    message: str
    data: UserInfoData


class MenuResponse(BaseModel):
    id: int
    menu_name: str
    path: Optional[str] = None
    component: Optional[str] = None
    icon: Optional[str] = None
    parent_id: int
    sort_order: int
    menu_type: Optional[str] = None
    permission: Optional[str] = None
    status: int
    children: List["MenuResponse"] = []


class MenusResponse(BaseModel):
    code: int
    message: str
    data: List[MenuResponse]


class PageInfo(BaseModel):
    page: int
    page_size: int
    total: int


class UserListData(BaseModel):
    rows: List[UserResponse]
    total: int
    page: int
    page_size: int


class UserListResponse(BaseModel):
    code: int
    message: str
    data: UserListData


class ResponseModel(BaseModel):
    code: int
    message: str
    data: Optional[Any] = None


MenuResponse.model_rebuild()
