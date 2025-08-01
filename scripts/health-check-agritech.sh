#!/bin/bash

# AgriTech Health Check Script for SPR System
# Usage: ./health-check-agritech.sh [environment]

set -e

ENVIRONMENT=${1:-"development"}
BASE_URL=""
API_KEY=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🌾 SPR AgriTech Health Check - Environment: $ENVIRONMENT${NC}"

# Set environment-specific URLs
case $ENVIRONMENT in
    "development")
        BASE_URL="http://localhost:8000"
        ;;
    "staging")
        BASE_URL="https://staging.spr-agritech.com"
        API_KEY=$STAGING_API_KEY
        ;;
    "production")
        BASE_URL="https://spr-agritech.com"
        API_KEY=$PRODUCTION_API_KEY
        ;;
    *)
        echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
        exit 1
        ;;
esac

# Function to make API calls with optional authentication
api_call() {
    local endpoint=$1
    local expected_status=${2:-200}
    
    if [ -n "$API_KEY" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -H "Authorization: Bearer $API_KEY" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS:.*//')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ $endpoint - Status: $http_code${NC}"
        return 0
    else
        echo -e "${RED}❌ $endpoint - Status: $http_code (Expected: $expected_status)${NC}"
        echo -e "${YELLOW}Response: $body${NC}"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    echo -e "${BLUE}🗄 Checking Database Health...${NC}"
    
    if api_call "/api/v1/database/health"; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        return 1
    fi
}

# Function to check Redis cache
check_redis() {
    echo -e "${BLUE}🔄 Checking Redis Cache...${NC}"
    
    if api_call "/api/v1/cache/health"; then
        echo -e "${GREEN}✅ Redis cache operational${NC}"
    else
        echo -e "${RED}❌ Redis cache failed${NC}"
        return 1
    fi
}

# Function to check commodity price APIs
check_commodity_apis() {
    echo -e "${BLUE}🌾 Checking Commodity Price APIs...${NC}"
    
    # Test major commodities
    commodities=("soja" "milho" "boi" "cafe")
    
    for commodity in "${commodities[@]}"; do
        if api_call "/api/v1/pricing/prices/$commodity?limit=1"; then
            echo -e "${GREEN}✅ $commodity price API working${NC}"
        else
            echo -e "${RED}❌ $commodity price API failed${NC}"
            return 1
        fi
    done
}

# Function to check external data sources
check_external_data() {
    echo -e "${BLUE}🌐 Checking External Data Sources...${NC}"
    
    # Check IBGE API connectivity
    if api_call "/api/v1/data/status"; then
        echo -e "${GREEN}✅ External data sources accessible${NC}"
    else
        echo -e "${RED}❌ External data sources failed${NC}"
        return 1
    fi
    
    # Validate last data update
    response=$(curl -s "$BASE_URL/api/v1/data/status")
    last_update=$(echo $response | jq -r '.last_update // empty')
    
    if [ -n "$last_update" ]; then
        echo -e "${GREEN}✅ Last data update: $last_update${NC}"
    else
        echo -e "${YELLOW}⚠️  No recent data updates found${NC}"
    fi
}

# Function to check WhatsApp integration
check_whatsapp() {
    echo -e "${BLUE}💬 Checking WhatsApp Integration...${NC}"
    
    if api_call "/api/v1/whatsapp/status"; then
        echo -e "${GREEN}✅ WhatsApp service operational${NC}"
    else
        echo -e "${RED}❌ WhatsApp service failed${NC}"
        return 1
    fi
}

# Function to check prediction models
check_prediction_models() {
    echo -e "${BLUE}🔮 Checking Prediction Models...${NC}"
    
    # Test prediction endpoint with sample data
    prediction_data='{
        "commodity": "soja",
        "prediction_days": 7,
        "model_type": "linear_regression"
    }'
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_KEY" \
        -d "$prediction_data" \
        "$BASE_URL/api/v1/pricing/predict")
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✅ Prediction models working${NC}"
    else
        echo -e "${RED}❌ Prediction models failed - Status: $http_code${NC}"
        return 1
    fi
}

# Function to check analytics and reporting
check_analytics() {
    echo -e "${BLUE}📊 Checking Analytics & Reporting...${NC}"
    
    # Test market report generation
    if api_call "/api/v1/analytics/reports/market?commodity=soja&period=weekly"; then
        echo -e "${GREEN}✅ Analytics service operational${NC}"
    else
        echo -e "${RED}❌ Analytics service failed${NC}"
        return 1
    fi
}

# Function to check system performance metrics
check_performance() {
    echo -e "${BLUE}⚡ Checking System Performance...${NC}"
    
    # Measure API response time
    start_time=$(date +%s%N)
    api_call "/api/v1/pricing/prices/soja?limit=1" > /dev/null 2>&1
    end_time=$(date +%s%N)
    
    response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    if [ "$response_time" -lt 1000 ]; then
        echo -e "${GREEN}✅ API response time: ${response_time}ms (Good)${NC}"
    elif [ "$response_time" -lt 2000 ]; then
        echo -e "${YELLOW}⚠️  API response time: ${response_time}ms (Acceptable)${NC}"
    else
        echo -e "${RED}❌ API response time: ${response_time}ms (Slow)${NC}"
        return 1
    fi
}

# Function to generate health report
generate_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="health-check-report-$ENVIRONMENT-$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$report_file" << EOF
{
    "environment": "$ENVIRONMENT",
    "timestamp": "$timestamp",
    "checks": {
        "database": $database_status,
        "redis": $redis_status,
        "commodity_apis": $commodity_status,
        "external_data": $external_data_status,
        "whatsapp": $whatsapp_status,
        "prediction_models": $prediction_status,
        "analytics": $analytics_status,
        "performance": $performance_status
    },
    "overall_status": "$overall_status"
}
EOF
    
    echo -e "${BLUE}📄 Health report generated: $report_file${NC}"
}

# Main health check execution
main() {
    local failed_checks=0
    
    # Initialize status variables
    database_status="false"
    redis_status="false"
    commodity_status="false"
    external_data_status="false"
    whatsapp_status="false"
    prediction_status="false"
    analytics_status="false"
    performance_status="false"
    
    # Run all health checks
    echo -e "${BLUE}Starting comprehensive health check...${NC}\n"
    
    check_database && database_status="true" || failed_checks=$((failed_checks + 1))
    echo ""
    
    check_redis && redis_status="true" || failed_checks=$((failed_checks + 1))
    echo ""
    
    check_commodity_apis && commodity_status="true" || failed_checks=$((failed_checks + 1))
    echo ""
    
    check_external_data && external_data_status="true" || failed_checks=$((failed_checks + 1))
    echo ""
    
    check_whatsapp && whatsapp_status="true" || failed_checks=$((failed_checks + 1))
    echo ""
    
    check_prediction_models && prediction_status="true" || failed_checks=$((failed_checks + 1))
    echo ""
    
    check_analytics && analytics_status="true" || failed_checks=$((failed_checks + 1))
    echo ""
    
    check_performance && performance_status="true" || failed_checks=$((failed_checks + 1))
    echo ""
    
    # Determine overall status
    if [ $failed_checks -eq 0 ]; then
        overall_status="healthy"
        echo -e "${GREEN}🎉 All systems healthy! SPR AgriTech is fully operational.${NC}"
    elif [ $failed_checks -lt 3 ]; then
        overall_status="degraded"
        echo -e "${YELLOW}⚠️  System is degraded. $failed_checks checks failed.${NC}"
    else
        overall_status="unhealthy"
        echo -e "${RED}❌ System is unhealthy. $failed_checks checks failed.${NC}"
    fi
    
    # Generate report
    generate_report
    
    # Exit with appropriate code
    if [ "$overall_status" == "healthy" ] || [ "$overall_status" == "degraded" ]; then
        exit 0
    else
        exit 1
    fi
}

# Check if jq is available for JSON parsing
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq not found. Installing...${NC}"
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y jq
    elif command -v yum &> /dev/null; then
        sudo yum install -y jq
    else
        echo -e "${RED}❌ Cannot install jq. Please install manually.${NC}"
        exit 1
    fi
fi

# Run main function
main