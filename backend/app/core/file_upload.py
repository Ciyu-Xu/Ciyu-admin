import os
import uuid
import base64
import re
from pathlib import Path
from app.core.config import settings


def save_base64_image(base64_data: str, sub_dir: str = "avatars") -> str:
    upload_dir = Path(settings.UPLOAD_DIR) / sub_dir
    upload_dir.mkdir(parents=True, exist_ok=True)

    match = re.match(r'^data:image/(\w+);base64,(.+)$', base64_data)
    if not match:
        return base64_data

    image_type = match.group(1)
    image_data = match.group(2)

    if image_type not in ("jpeg", "jpg", "png", "gif", "webp"):
        image_type = "png"

    try:
        image_bytes = base64.b64decode(image_data)
    except Exception:
        return base64_data

    filename = f"{uuid.uuid4().hex}.{image_type}"
    file_path = upload_dir / filename

    with open(file_path, "wb") as f:
        f.write(image_bytes)

    return f"/uploads/{sub_dir}/{filename}"
