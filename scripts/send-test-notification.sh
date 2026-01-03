#!/bin/bash
# ============================================================================
# Send Test Notification Script
# ============================================================================
# This script sends a test push notification via the Edge Function.
# Use this to verify the notification system is working correctly.
#
# Usage:
#   ./scripts/send-test-notification.sh <USER_ID> [NOTIFICATION_TYPE]
#
# Arguments:
#   USER_ID           - UUID of the user to send notification to
#   NOTIFICATION_TYPE - "match" or "message" (default: "match")
#
# Environment Variables (required):
#   SUPABASE_URL          - Your Supabase project URL
#   SUPABASE_SERVICE_KEY  - Your Supabase service role key
#
# Examples:
#   # Send match notification
#   ./scripts/send-test-notification.sh abc123-def456-...
#
#   # Send message notification
#   ./scripts/send-test-notification.sh abc123-def456-... message
# ============================================================================

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Error: USER_ID is required${NC}"
    echo "Usage: $0 <USER_ID> [NOTIFICATION_TYPE]"
    exit 1
fi

USER_ID=$1
NOTIFICATION_TYPE=${2:-"match"}

# Validate notification type
if [ "$NOTIFICATION_TYPE" != "match" ] && [ "$NOTIFICATION_TYPE" != "message" ]; then
    echo -e "${RED}Error: NOTIFICATION_TYPE must be 'match' or 'message'${NC}"
    exit 1
fi

# Check environment variables
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${YELLOW}Warning: SUPABASE_URL not set. Using default local URL.${NC}"
    SUPABASE_URL="http://localhost:54321"
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}Error: SUPABASE_SERVICE_KEY environment variable is required${NC}"
    echo "Set it with: export SUPABASE_SERVICE_KEY='your-service-role-key'"
    exit 1
fi

# Build notification payload based on type
if [ "$NOTIFICATION_TYPE" = "match" ]; then
    TITLE="Test Match Notification"
    BODY="This is a test match notification. Someone is interested in connecting with you!"
    URL="backtrack://conversation/test-match-id"
else
    TITLE="Test Message Notification"
    BODY="Your match: Hello! This is a test message to verify notifications are working."
    URL="backtrack://conversation/test-message-id"
fi

EDGE_FUNCTION_URL="${SUPABASE_URL}/functions/v1/send-notification"

echo -e "${GREEN}Sending test notification...${NC}"
echo "  User ID: $USER_ID"
echo "  Type: $NOTIFICATION_TYPE"
echo "  Title: $TITLE"
echo "  URL: $EDGE_FUNCTION_URL"
echo ""

# Send the notification
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "${EDGE_FUNCTION_URL}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"${USER_ID}\",
        \"title\": \"${TITLE}\",
        \"body\": \"${BODY}\",
        \"data\": {
            \"type\": \"${NOTIFICATION_TYPE}\",
            \"url\": \"${URL}\",
            \"id\": \"test-${NOTIFICATION_TYPE}-$(date +%s)\"
        }
    }")

# Extract HTTP status code and response body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}Notification sent successfully! (HTTP $HTTP_CODE)${NC}"

    # Parse success/skipped from response
    SUCCESS=$(echo "$BODY" | jq -r '.success // "unknown"' 2>/dev/null)
    SKIPPED=$(echo "$BODY" | jq -r '.skipped // "false"' 2>/dev/null)
    SENT_COUNT=$(echo "$BODY" | jq -r '.sentCount // "0"' 2>/dev/null)
    REASON=$(echo "$BODY" | jq -r '.reason // ""' 2>/dev/null)

    if [ "$SKIPPED" = "true" ]; then
        echo -e "${YELLOW}Note: Notification was skipped.${NC}"
        echo "Reason: $REASON"
    else
        echo "Notifications sent: $SENT_COUNT"
    fi
else
    echo -e "${RED}Failed to send notification (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Done!${NC}"
echo ""
echo "If you didn't receive a notification, check:"
echo "  1. User has a registered push token in expo_push_tokens table"
echo "  2. User has notifications enabled in notification_preferences"
echo "  3. Edge Function logs: npx supabase functions logs send-notification"
