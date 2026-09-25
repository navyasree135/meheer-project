from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.redis_client import cache_manager
from app.models import Dataset, Observation, Action

router = APIRouter(prefix="/datasets", tags=["Dataset Management"])

@router.get("")
async def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(Dataset).order_by(desc(Dataset.uploaded_at)).all()
    return [d.to_dict() for d in datasets]

@router.post("/{dataset_id}/activate")
async def activate_dataset(dataset_id: str, db: Session = Depends(get_db)):
    target_ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not target_ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Deactivate all others
    db.query(Dataset).update({"is_active": False})
    target_ds.is_active = True
    db.commit()

    # Invalidate cache
    cache_manager.invalidate_prefix("dash:")

    return {
        "success": True,
        "message": f"Activated dataset {target_ds.filename}",
        "dataset": target_ds.to_dict()
    }

@router.delete("/{dataset_id}")
async def delete_dataset(dataset_id: str, db: Session = Depends(get_db)):
    target_ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not target_ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    db.delete(target_ds)
    db.commit()

    # Invalidate cache
    cache_manager.invalidate_prefix(f"dash:{dataset_id}")
    cache_manager.invalidate_prefix("dash:active")

    return {
        "success": True,
        "message": f"Deleted dataset {target_ds.filename}"
    }
