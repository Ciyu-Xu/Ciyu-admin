from fastapi import Request


def get_client_ip(request: Request) -> str:
    """获取客户端真实 IP
    
    优先级: X-Forwarded-For > X-Real-IP > client.host
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    if request.client:
        return request.client.host

    return "127.0.0.1"
