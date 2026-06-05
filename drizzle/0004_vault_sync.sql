CREATE TABLE IF NOT EXISTS vault_sync_records (
  id TEXT PRIMARY KEY NOT NULL,
  vaultId TEXT NOT NULL,
  recordKey TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT,
  deviceId TEXT
);

CREATE INDEX IF NOT EXISTS vault_sync_records_vault_id_idx
ON vault_sync_records (vaultId);

CREATE INDEX IF NOT EXISTS vault_sync_records_vault_record_idx
ON vault_sync_records (vaultId, recordKey);

CREATE INDEX IF NOT EXISTS vault_sync_records_updated_at_idx
ON vault_sync_records (updatedAt);
