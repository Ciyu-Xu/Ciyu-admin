from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.db.session import get_db
from app.models.user import User, DictType, DictData
from app.schemas.user import ResponseModel
from app.api.v1.deps import get_current_user

router = APIRouter()


@router.get("/dict/type", response_model=ResponseModel)
async def get_dict_types(
    dict_name: Optional[str] = None,
    dict_type: Optional[str] = None,
    status: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取字典类型列表"""
    conditions = []
    if dict_name:
        conditions.append(DictType.dict_name.ilike(f"%{dict_name}%"))
    if dict_type:
        conditions.append(DictType.dict_type.ilike(f"%{dict_type}%"))
    if status is not None:
        conditions.append(DictType.status == status)
    
    where_clause = and_(*conditions) if conditions else True
    
    count_query = select(func.count()).where(where_clause).select_from(DictType)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    offset = (page - 1) * page_size
    result = await db.execute(
        select(DictType).where(where_clause).offset(offset).limit(page_size).order_by(DictType.id.desc())
    )
    dict_types = result.scalars().all()
    
    rows = []
    for dt in dict_types:
        rows.append({
            "id": dt.id,
            "dict_name": dt.dict_name,
            "dict_type": dt.dict_type,
            "status": dt.status,
            "create_time": dt.create_time.isoformat() if dt.create_time else None,
        })
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "rows": rows,
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }


@router.get("/dict/type/{dict_id}", response_model=ResponseModel)
async def get_dict_type(
    dict_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取单个字典类型"""
    result = await db.execute(select(DictType).where(DictType.id == dict_id))
    dict_type = result.scalar_one_or_none()
    
    if not dict_type:
        raise HTTPException(status_code=404, detail="字典类型不存在")
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "id": dict_type.id,
            "dict_name": dict_type.dict_name,
            "dict_type": dict_type.dict_type,
            "status": dict_type.status,
            "create_time": dict_type.create_time.isoformat() if dict_type.create_time else None,
        }
    }


@router.post("/dict/type", response_model=ResponseModel)
async def create_dict_type(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建字典类型"""
    dict_name = data.get("dict_name")
    dict_type_val = data.get("dict_type")
    status = data.get("status", 1)
    
    result = await db.execute(select(DictType).where(DictType.dict_type == dict_type_val))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="字典类型已存在")
    
    new_dict_type = DictType(
        dict_name=dict_name,
        dict_type=dict_type_val,
        status=status
    )
    db.add(new_dict_type)
    await db.commit()
    await db.refresh(new_dict_type)
    
    return {"code": 200, "message": "创建成功", "data": {"id": new_dict_type.id}}


@router.put("/dict/type/{dict_id}", response_model=ResponseModel)
async def update_dict_type(
    dict_id: int,
    request_body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新字典类型"""
    dict_name = request_body.get("dict_name")
    dict_type_val = request_body.get("dict_type")
    status = request_body.get("status")
    
    result = await db.execute(select(DictType).where(DictType.id == dict_id))
    dict_type_obj = result.scalar_one_or_none()
    
    if not dict_type_obj:
        raise HTTPException(status_code=404, detail="字典类型不存在")
    
    result = await db.execute(
        select(DictType).where(
            DictType.dict_type == dict_type_val,
            DictType.id != dict_id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="字典类型标识已存在")
    
    dict_type_obj.dict_name = dict_name
    dict_type_obj.dict_type = dict_type_val
    dict_type_obj.status = status
    await db.commit()
    
    return {"code": 200, "message": "更新成功"}


@router.delete("/dict/type/{dict_id}", response_model=ResponseModel)
async def delete_dict_type(
    dict_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除字典类型（同时删除该类型下的所有字典数据）"""
    result = await db.execute(select(DictType).where(DictType.id == dict_id))
    dict_type = result.scalar_one_or_none()
    
    if not dict_type:
        raise HTTPException(status_code=404, detail="字典类型不存在")
    
    await db.execute(select(DictData).where(DictData.dict_id == dict_id))
    result = await db.execute(select(DictData).where(DictData.dict_id == dict_id))
    dict_datas = result.scalars().all()
    for dd in dict_datas:
        await db.delete(dd)
    
    await db.delete(dict_type)
    await db.commit()
    
    return {"code": 200, "message": "删除成功"}


@router.get("/dict/data", response_model=ResponseModel)
async def get_dict_datas(
    dict_type: Optional[str] = None,
    dict_label: Optional[str] = None,
    status: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取字典数据列表"""
    conditions = []
    if dict_type:
        result = await db.execute(select(DictType).where(DictType.dict_type == dict_type))
        dict_type_obj = result.scalar_one_or_none()
        if dict_type_obj:
            conditions.append(DictData.dict_id == dict_type_obj.id)
    if dict_label:
        conditions.append(DictData.dict_label.ilike(f"%{dict_label}%"))
    if status is not None:
        conditions.append(DictData.status == status)
    
    where_clause = and_(*conditions) if conditions else True
    
    count_query = select(func.count()).where(where_clause).select_from(DictData)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    offset = (page - 1) * page_size
    result = await db.execute(
        select(DictData).where(where_clause).offset(offset).limit(page_size).order_by(DictData.sort_order.asc(), DictData.id.desc())
    )
    dict_datas = result.scalars().all()
    
    rows = []
    for dd in dict_datas:
        rows.append({
            "id": dd.id,
            "dict_id": dd.dict_id,
            "dict_label": dd.dict_label,
            "dict_value": dd.dict_value,
            "sort_order": dd.sort_order,
            "remark": dd.remark,
            "status": dd.status,
            "create_time": dd.create_time.isoformat() if dd.create_time else None,
        })
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "rows": rows,
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }


@router.get("/dict/data/{data_id}", response_model=ResponseModel)
async def get_dict_data(
    data_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取单个字典数据"""
    result = await db.execute(select(DictData).where(DictData.id == data_id))
    dict_data = result.scalar_one_or_none()
    
    if not dict_data:
        raise HTTPException(status_code=404, detail="字典数据不存在")
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": {
            "id": dict_data.id,
            "dict_id": dict_data.dict_id,
            "dict_label": dict_data.dict_label,
            "dict_value": dict_data.dict_value,
            "sort_order": dict_data.sort_order,
            "remark": dict_data.remark,
            "status": dict_data.status,
        }
    }


@router.post("/dict/data", response_model=ResponseModel)
async def create_dict_data(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建字典数据"""
    dict_id = data.get("dict_id")
    dict_label = data.get("dict_label")
    dict_value = data.get("dict_value")
    sort_order = data.get("sort_order", 0)
    remark = data.get("remark")
    status = data.get("status", 1)
    
    result = await db.execute(select(DictType).where(DictType.id == dict_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="字典类型不存在")
    
    new_dict_data = DictData(
        dict_id=dict_id,
        dict_label=dict_label,
        dict_value=dict_value,
        sort_order=sort_order,
        remark=remark,
        status=status
    )
    db.add(new_dict_data)
    await db.commit()
    await db.refresh(new_dict_data)
    
    return {"code": 200, "message": "创建成功", "data": {"id": new_dict_data.id}}


@router.put("/dict/data/{data_id}", response_model=ResponseModel)
async def update_dict_data(
    data_id: int,
    request_body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新字典数据"""
    dict_label = request_body.get("dict_label")
    dict_value = request_body.get("dict_value")
    sort_order = request_body.get("sort_order")
    remark = request_body.get("remark")
    status = request_body.get("status")
    
    result = await db.execute(select(DictData).where(DictData.id == data_id))
    dict_data = result.scalar_one_or_none()
    
    if not dict_data:
        raise HTTPException(status_code=404, detail="字典数据不存在")
    
    dict_data.dict_label = dict_label
    dict_data.dict_value = dict_value
    dict_data.sort_order = sort_order
    dict_data.remark = remark
    dict_data.status = status
    await db.commit()
    
    return {"code": 200, "message": "更新成功"}


@router.delete("/dict/data/{data_id}", response_model=ResponseModel)
async def delete_dict_data(
    data_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除字典数据"""
    result = await db.execute(select(DictData).where(DictData.id == data_id))
    dict_data = result.scalar_one_or_none()
    
    if not dict_data:
        raise HTTPException(status_code=404, detail="字典数据不存在")
    
    await db.delete(dict_data)
    await db.commit()
    
    return {"code": 200, "message": "删除成功"}


@router.get("/dict/optionselect", response_model=ResponseModel)
async def get_dict_optionselect(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取字典类型选择列表"""
    result = await db.execute(
        select(DictType).where(DictType.status == 1).order_by(DictType.id.desc())
    )
    dict_types = result.scalars().all()
    
    options = []
    for dt in dict_types:
        options.append({
            "id": dt.id,
            "dictLabel": dt.dict_name,
            "dictType": dt.dict_type,
        })
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": options
    }


@router.get("/dict/data/typedata", response_model=ResponseModel)
async def get_typedata(
    dict_type: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """根据字典类型获取字典数据"""
    result = await db.execute(select(DictType).where(DictType.dict_type == dict_type))
    dict_type_obj = result.scalar_one_or_none()
    
    if not dict_type_obj:
        raise HTTPException(status_code=404, detail="字典类型不存在")
    
    result = await db.execute(
        select(DictData).where(
            DictData.dict_id == dict_type_obj.id,
            DictData.status == 1
        ).order_by(DictData.sort_order.asc())
    )
    dict_datas = result.scalars().all()
    
    rows = []
    for dd in dict_datas:
        rows.append({
            "id": dd.id,
            "dictLabel": dd.dict_label,
            "dictValue": dd.dict_value,
        })
    
    return {
        "code": 200,
        "message": "操作成功",
        "data": rows
    }
