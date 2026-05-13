import random
import io
import base64
import uuid
from typing import Dict, Optional
from PIL import Image, ImageDraw, ImageFont


class CaptchaManager:
    """验证码管理器"""
    
    def __init__(self):
        self._captcha_store: Dict[str, str] = {}
    
    def generate_code(self, length: int = 4) -> str:
        """生成随机验证码"""
        chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        return ''.join(random.choice(chars) for _ in range(length))
    
    def create_captcha_image(self, code: str) -> str:
        """创建验证码图片，返回 base64 编码"""
        width, height = 250, 60
        
        bgcolor = (255, 255, 255)
        linecolor = (random.randint(0, 128), random.randint(0, 128), random.randint(0, 128))
        dotcolor = (random.randint(0, 128), random.randint(0, 128), random.randint(0, 128))
        fontcolor = (random.randint(0, 128), random.randint(0, 128), random.randint(0, 128))
        
        img = Image.new('RGB', (width, height), bgcolor)
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype("arial.ttf", 36)
        except:
            try:
                font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 36)
            except:
                try:
                    font = ImageFont.truetype("C:/Windows/Fonts/simhei.ttf", 36)
                except:
                    font = ImageFont.load_default(size=36)
        
        for _ in range(5):
            x1 = random.randint(0, width)
            y1 = random.randint(0, height)
            x2 = random.randint(0, width)
            y2 = random.randint(0, height)
            draw.line((x1, y1, x2, y2), fill=linecolor, width=2)
        
        for _ in range(200):
            x = random.randint(0, width)
            y = random.randint(0, height)
            draw.point((x, y), fill=dotcolor)
        
        for i, char in enumerate(code):
            x = 20 + i * 55
            y = random.randint(5, 15)
            
            shadow_offset = random.randint(1, 3)
            shadow_x = x + shadow_offset
            shadow_y = y + shadow_offset
            
            draw.text((shadow_x, shadow_y), char, font=font, fill=(180, 180, 180))
            draw.text((x, y), char, font=font, fill=fontcolor)
        
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode()
    
    def store(self, session_id: Optional[str] = None) -> tuple:
        """生成并存储验证码，返回 (session_id, code)"""
        if session_id is None:
            session_id = str(uuid.uuid4())
        
        code = self.generate_code()
        self._captcha_store[session_id] = code.lower()
        return session_id, code
    
    def verify(self, session_id: str, user_input: str) -> bool:
        """验证验证码"""
        stored_code = self._captcha_store.get(session_id)
        if stored_code is None:
            return False
        
        del self._captcha_store[session_id]
        
        return stored_code == user_input.lower()
    
    def get(self, session_id: str) -> Optional[str]:
        """获取验证码（不删除）"""
        return self._captcha_store.get(session_id)


captcha_manager = CaptchaManager()
