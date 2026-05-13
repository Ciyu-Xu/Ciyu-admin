from fastapi import APIRouter
from app.core.captcha import captcha_manager
from app.schemas.user import ResponseModel

router = APIRouter()


@router.get("/captcha", response_model=ResponseModel)
async def get_captcha():
    """获取验证码图片"""
    session_id, code = captcha_manager.store()
    image_base64 = captcha_manager.create_captcha_image(code)
    
    return {
        "code": 200,
        "message": "获取成功",
        "data": {
            "session_id": session_id,
            "image": f"data:image/png;base64,{image_base64}"
        }
    }


@router.post("/verify", response_model=ResponseModel)
async def verify_captcha(
    session_id: str,
    captcha: str
):
    """验证验证码"""
    is_valid = captcha_manager.verify(session_id, captcha)
    
    if is_valid:
        return {
            "code": 200,
            "message": "验证成功",
            "data": {"valid": True}
        }
    else:
        return {
            "code": 400,
            "message": "验证码错误",
            "data": {"valid": False}
        }
