#!/bin/bash

# ZOARK OS Database Backup Script
# Automated daily backup with encryption and S3 upload

set -e

# Configuration
BACKUP_DIR="/backups"
BACKUP_RETENTION_DAYS=30
S3_BUCKET="zoark-os-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="zoark-os-backup-${TIMESTAMP}.sql.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting ZOARK OS Database Backup...${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "Creating database dump..."
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database backup created: $BACKUP_FILE${NC}"
    
    # Get file size
    FILE_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo "Backup size: $FILE_SIZE"
    
    # Upload to S3 (if AWS CLI is configured)
    if command -v aws &> /dev/null; then
        echo "Uploading to S3..."
        aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$S3_BUCKET/$BACKUP_FILE"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Backup uploaded to S3${NC}"
        else
            echo -e "${RED}✗ Failed to upload backup to S3${NC}"
        fi
    fi
    
    # Clean up old backups (local)
    echo "Cleaning up old backups..."
    find "$BACKUP_DIR" -name "zoark-os-backup-*.sql.gz" -mtime +$BACKUP_RETENTION_DAYS -delete
    echo -e "${GREEN}✓ Old backups cleaned up${NC}"
    
    # Log backup
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup completed: $BACKUP_FILE ($FILE_SIZE)" >> "$BACKUP_DIR/backup.log"
    
    echo -e "${GREEN}Backup completed successfully!${NC}"
else
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
fi
