"""initial normalized schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-25 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create Datasets table
    op.create_table(
        'datasets',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('row_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('s3_key', sa.String(length=512), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('status', sa.String(length=32), nullable=True, server_default='PROCESSING'),
        sa.Column('uploaded_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_datasets_id'), 'datasets', ['id'], unique=False)
    op.create_index(op.f('ix_datasets_is_active'), 'datasets', ['is_active'], unique=False)

    # 2. Create Observations table
    op.create_table(
        'observations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('dataset_id', sa.String(length=64), nullable=False),
        sa.Column('seq_no', sa.Integer(), nullable=True),
        sa.Column('observation_id', sa.String(length=64), nullable=False),
        sa.Column('has_suffix_s', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('occurrence_date', sa.Date(), nullable=False),
        sa.Column('occurrence_iso_year', sa.Integer(), nullable=False),
        sa.Column('occurrence_iso_week', sa.Integer(), nullable=False),
        sa.Column('occurrence_week_label', sa.String(length=64), nullable=False),
        sa.Column('raw_type', sa.String(length=512), nullable=True),
        sa.Column('category', sa.String(length=128), nullable=False),
        sa.Column('sub_category', sa.String(length=128), nullable=True),
        sa.Column('detail', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('raw_location', sa.String(length=512), nullable=True),
        sa.Column('unit', sa.String(length=64), nullable=False),
        sa.Column('sub_location', sa.String(length=128), nullable=True),
        sa.Column('exact_location', sa.String(length=255), nullable=True),
        sa.Column('reported_on', sa.Date(), nullable=True),
        sa.Column('reported_iso_year', sa.Integer(), nullable=True),
        sa.Column('reported_iso_week', sa.Integer(), nullable=True),
        sa.Column('reported_week_label', sa.String(length=64), nullable=True),
        sa.Column('reporting_lag_days', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('risk_level', sa.String(length=32), nullable=True, server_default='Unclassified'),
        sa.Column('observation_status', sa.String(length=64), nullable=True, server_default='Open'),
        sa.Column('pair_present', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('closure_date', sa.Date(), nullable=True),
        sa.Column('closed_by', sa.String(length=128), nullable=True),
        sa.Column('reason_for_no_actions', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['dataset_id'], ['datasets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_observations_category'), 'observations', ['category'], unique=False)
    op.create_index(op.f('ix_observations_dataset_id'), 'observations', ['dataset_id'], unique=False)
    op.create_index(op.f('ix_observations_detail'), 'observations', ['detail'], unique=False)
    op.create_index(op.f('ix_observations_has_suffix_s'), 'observations', ['has_suffix_s'], unique=False)
    op.create_index(op.f('ix_observations_observation_id'), 'observations', ['observation_id'], unique=False)
    op.create_index(op.f('ix_observations_observation_status'), 'observations', ['observation_status'], unique=False)
    op.create_index(op.f('ix_observations_occurrence_date'), 'observations', ['occurrence_date'], unique=False)
    op.create_index(op.f('ix_observations_occurrence_iso_week'), 'observations', ['occurrence_iso_week'], unique=False)
    op.create_index(op.f('ix_observations_occurrence_iso_year'), 'observations', ['occurrence_iso_year'], unique=False)
    op.create_index(op.f('ix_observations_occurrence_week_label'), 'observations', ['occurrence_week_label'], unique=False)
    op.create_index(op.f('ix_observations_pair_present'), 'observations', ['pair_present'], unique=False)
    op.create_index(op.f('ix_observations_reported_on'), 'observations', ['reported_on'], unique=False)
    op.create_index(op.f('ix_observations_risk_level'), 'observations', ['risk_level'], unique=False)
    op.create_index(op.f('ix_observations_sub_category'), 'observations', ['sub_category'], unique=False)
    op.create_index(op.f('ix_observations_sub_location'), 'observations', ['sub_location'], unique=False)
    op.create_index(op.f('ix_observations_unit'), 'observations', ['unit'], unique=False)
    op.create_index('idx_dataset_obs_id', 'observations', ['dataset_id', 'observation_id'], unique=True)
    op.create_index('idx_obs_unit_category', 'observations', ['dataset_id', 'unit', 'category'], unique=False)
    op.create_index('idx_obs_week_risk', 'observations', ['dataset_id', 'occurrence_iso_week', 'risk_level'], unique=False)

    # 3. Create Unpivoted Actions table
    op.create_table(
        'actions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('observation_db_id', sa.Integer(), nullable=False),
        sa.Column('observation_id', sa.String(length=64), nullable=False),
        sa.Column('action_number', sa.Integer(), nullable=False),
        sa.Column('action_text', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=64), nullable=True, server_default='Open'),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('closure_date', sa.Date(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['observation_db_id'], ['observations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_actions_action_number'), 'actions', ['action_number'], unique=False)
    op.create_index(op.f('ix_actions_observation_db_id'), 'actions', ['observation_db_id'], unique=False)
    op.create_index(op.f('ix_actions_observation_id'), 'actions', ['observation_id'], unique=False)
    op.create_index(op.f('ix_actions_status'), 'actions', ['status'], unique=False)
    op.create_index('idx_action_obs_status', 'actions', ['observation_db_id', 'status'], unique=False)
    op.create_index('idx_action_status_number', 'actions', ['status', 'action_number'], unique=False)

def downgrade() -> None:
    op.drop_table('actions')
    op.drop_table('observations')
    op.drop_table('datasets')
