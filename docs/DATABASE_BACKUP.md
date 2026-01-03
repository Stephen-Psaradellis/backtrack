# Database Backup and Recovery Guide

This document outlines the backup strategy and recovery procedures for the Backtrack Supabase database.

## Supabase Built-in Backups

### Automatic Backups

Supabase provides automatic daily backups for all projects on paid plans:

- **Pro Plan**: Daily backups, 7-day retention
- **Team Plan**: Daily backups, 14-day retention
- **Enterprise**: Custom retention policies

### Point-in-Time Recovery (PITR)

Available on Pro plan and above:
- Restore to any point within retention window
- Granularity: 1 second
- Access via Supabase Dashboard > Database > Backups

## Manual Backup Procedures

### Full Database Dump

```bash
# Using pg_dump (requires database password)
pg_dump -h db.YOUR_PROJECT.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backtrack_backup_$(date +%Y%m%d_%H%M%S).dump

# With password from environment
PGPASSWORD=$SUPABASE_DATABASE_PW pg_dump -h db.YOUR_PROJECT.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backtrack_backup_$(date +%Y%m%d_%H%M%S).dump
```

### Schema-Only Backup

```bash
pg_dump -h db.YOUR_PROJECT.supabase.co \
  -U postgres \
  -d postgres \
  --schema-only \
  -f backtrack_schema_$(date +%Y%m%d).sql
```

### Data-Only Backup

```bash
pg_dump -h db.YOUR_PROJECT.supabase.co \
  -U postgres \
  -d postgres \
  --data-only \
  -f backtrack_data_$(date +%Y%m%d).sql
```

### Table-Specific Backup

```bash
# Backup specific tables
pg_dump -h db.YOUR_PROJECT.supabase.co \
  -U postgres \
  -d postgres \
  -t profiles \
  -t posts \
  -t conversations \
  -t messages \
  -f backtrack_core_tables_$(date +%Y%m%d).dump
```

## Backup Schedule

### Recommended Schedule

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Full database | Daily | 30 days | Cloud storage |
| Transaction logs | Continuous (PITR) | 7 days | Supabase |
| Schema | Weekly | 90 days | Git repository |
| Critical tables | Hourly | 7 days | Cloud storage |

### Critical Tables

These tables should have more frequent backups:

1. `profiles` - User data
2. `posts` - User-generated content
3. `conversations` - Chat history
4. `messages` - Message content
5. `expo_push_tokens` - Notification tokens

## Automated Backup Script

### backup.sh

```bash
#!/bin/bash

# Configuration
DB_HOST="db.YOUR_PROJECT.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
BACKUP_DIR="/backups/backtrack"
RETENTION_DAYS=30
S3_BUCKET="s3://backtrack-backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backtrack_${TIMESTAMP}.dump"

# Create backup
echo "Starting backup at $(date)"
PGPASSWORD=$SUPABASE_DATABASE_PW pg_dump \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  -F c \
  -f "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Upload to S3 (optional)
if command -v aws &> /dev/null; then
  aws s3 cp "$BACKUP_DIR/${BACKUP_FILE}.gz" "$S3_BUCKET/"
fi

# Clean up old backups
find $BACKUP_DIR -name "backtrack_*.dump.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed at $(date)"
```

### Cron Job

```bash
# Add to crontab for daily backup at 3 AM UTC
0 3 * * * /path/to/backup.sh >> /var/log/backtrack-backup.log 2>&1
```

## Recovery Procedures

### Restore from Supabase Dashboard

1. Navigate to Database > Backups
2. Select the backup point
3. Click "Restore"
4. Wait for restoration (may take several minutes)

### Restore from pg_dump

```bash
# Restore full database
pg_restore -h db.YOUR_PROJECT.supabase.co \
  -U postgres \
  -d postgres \
  -c \  # Clean (drop) database objects before recreating
  backtrack_backup.dump

# Restore specific tables
pg_restore -h db.YOUR_PROJECT.supabase.co \
  -U postgres \
  -d postgres \
  -t profiles \
  backtrack_backup.dump
```

### Restore from SQL File

```bash
psql -h db.YOUR_PROJECT.supabase.co \
  -U postgres \
  -d postgres \
  -f backtrack_schema.sql
```

## Disaster Recovery Plan

### RTO and RPO Targets

- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour (with PITR)

### Recovery Steps

1. **Assess the situation**
   - Identify what data was lost/corrupted
   - Determine the recovery point needed

2. **Notify stakeholders**
   - Engineering team
   - Product team
   - Users (if significant downtime expected)

3. **Initiate recovery**
   - Use PITR for recent data loss
   - Use daily backup for major issues

4. **Verify data integrity**
   - Run integrity checks
   - Verify critical data

5. **Resume operations**
   - Update any API keys if compromised
   - Monitor for issues

### Contact Information

| Role | Contact |
|------|---------|
| Database Admin | [Your DBA Email] |
| DevOps Lead | [Your DevOps Email] |
| Supabase Support | support@supabase.io |

## Storage Bucket Backups

### Backup Supabase Storage

The storage buckets (`selfie-photos`, `profile-photos`, `shared-photos`) should also be backed up:

```bash
# Using Supabase CLI
npx supabase storage download -b selfie-photos -p ./ -r

# Or using S3-compatible API
aws s3 sync s3://YOUR_PROJECT.supabase.co/storage/v1/s3/selfie-photos ./backups/selfie-photos
```

### Storage Backup Schedule

| Bucket | Frequency | Retention |
|--------|-----------|-----------|
| selfie-photos | Daily | 30 days |
| profile-photos | Daily | 30 days |
| shared-photos | Daily | 30 days |

## Monitoring and Alerts

### Backup Verification

```sql
-- Check last backup timestamp (if tracking in a table)
SELECT MAX(created_at) as last_backup
FROM backup_log
WHERE status = 'success';
```

### Health Checks

- Monitor backup job completion
- Verify backup file sizes
- Test restore procedures monthly

### Alerting

Set up alerts for:
- Backup job failures
- Backup size anomalies (>50% change)
- Storage quota approaching limits

## Compliance Considerations

### Data Retention

- **User data**: Retained while account active + 30 days after deletion
- **Posts**: Expired posts deleted after 30 days
- **Messages**: Retained for conversation lifetime
- **Backups**: Retained per schedule above

### GDPR/CCPA

- Backup data subject to same privacy requirements
- Include backup deletion in data deletion requests
- Document backup access controls

## Testing Backups

### Monthly Restore Test

1. Create a test database
2. Restore latest backup
3. Verify data integrity
4. Run application tests against restored data
5. Document results

### Restore Test Checklist

- [ ] Users can authenticate
- [ ] Posts are visible
- [ ] Messages are accessible
- [ ] Avatars render correctly
- [ ] Location data is correct
- [ ] RLS policies work correctly

## Best Practices

1. **Encrypt backups** at rest and in transit
2. **Store backups** in multiple locations/regions
3. **Test restores** regularly (at least monthly)
4. **Monitor backup** job status
5. **Document** all procedures and keep them updated
6. **Rotate credentials** used for backups
7. **Audit access** to backup storage
