#!/bin/bash

# =============================================================================
# AFMS Deployment Testing Script
# Script untuk testing dan verifikasi deployment Next.js + Laravel API
# Domain: afms.my.id (frontend) & api.afms.my.id (backend)
# =============================================================================

set -e  # Exit on any error

# =============================================================================
# Configuration Variables
# =============================================================================
APP_NAME="afms"
PROJECT_DIR="/var/www/${APP_NAME}"
DOMAIN_FRONTEND="afms.my.id"
DOMAIN_BACKEND="api.afms.my.id"
TEST_TIMEOUT=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test results
TEST_RESULTS=()
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# =============================================================================
# Helper Functions
# =============================================================================

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_test() {
    echo -e "${PURPLE}[TEST]${NC} $1"
}

print_result() {
    if [ "$1" = "PASS" ]; then
        echo -e "${GREEN}[PASS]${NC} $2"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}[FAIL]${NC} $2"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
    TEST_RESULTS+=("$1: $2")
}

# Test HTTP response
test_http_response() {
    local url="$1"
    local expected_code="$2"
    local test_name="$3"
    local timeout="${4:-$TEST_TIMEOUT}"
    
    print_test "Testing: $test_name"
    
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$timeout" "$url" 2>/dev/null || echo "000")
    
    if [[ "$response_code" == "$expected_code" ]]; then
        print_result "PASS" "$test_name (HTTP $response_code)"
        return 0
    else
        print_result "FAIL" "$test_name (Expected: $expected_code, Got: $response_code)"
        return 1
    fi
}

# Test SSL certificate
test_ssl_certificate() {
    local domain="$1"
    local test_name="$2"
    
    print_test "Testing: $test_name"
    
    local ssl_info
    ssl_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "ERROR")
    
    if [[ "$ssl_info" != "ERROR" ]] && [[ "$ssl_info" =~ "notAfter" ]]; then
        local expiry_date
        expiry_date=$(echo "$ssl_info" | grep "notAfter" | cut -d= -f2)
        print_result "PASS" "$test_name (Expires: $expiry_date)"
        return 0
    else
        print_result "FAIL" "$test_name (SSL certificate not found or invalid)"
        return 1
    fi
}

# Test Docker container
test_docker_container() {
    local container_name="$1"
    local test_name="$2"
    
    print_test "Testing: $test_name"
    
    if docker ps --format "table {{.Names}}" | grep -q "$container_name"; then
        local status
        status=$(docker ps --filter "name=$container_name" --format "{{.Status}}")
        print_result "PASS" "$test_name (Status: $status)"
        return 0
    else
        print_result "FAIL" "$test_name (Container not running)"
        return 1
    fi
}

# Test service health
test_service_health() {
    local service_url="$1"
    local test_name="$2"
    
    print_test "Testing: $test_name"
    
    local response
    response=$(curl -s --connect-timeout "$TEST_TIMEOUT" "$service_url" 2>/dev/null || echo "ERROR")
    
    if [[ "$response" =~ "healthy" ]] || [[ "$response" =~ "OK" ]]; then
        print_result "PASS" "$test_name (Response: ${response:0:50}...)"
        return 0
    else
        print_result "FAIL" "$test_name (Unhealthy or no response)"
        return 1
    fi
}

# Test DNS resolution
test_dns_resolution() {
    local domain="$1"
    local test_name="$2"
    
    print_test "Testing: $test_name"
    
    if nslookup "$domain" >/dev/null 2>&1; then
        local ip
        ip=$(nslookup "$domain" | grep "Address:" | tail -1 | awk '{print $2}')
        print_result "PASS" "$test_name (Resolves to: $ip)"
        return 0
    else
        print_result "FAIL" "$test_name (DNS resolution failed)"
        return 1
    fi
}

# =============================================================================
# System Tests
# =============================================================================
test_system_requirements() {
    echo
    echo "=============================================================================="
    echo "                        SYSTEM REQUIREMENTS TESTS"
    echo "=============================================================================="
    
    # Test Docker
    print_test "Testing: Docker installation"
    if command -v docker >/dev/null 2>&1; then
        local docker_version
        docker_version=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_result "PASS" "Docker installation (Version: $docker_version)"
    else
        print_result "FAIL" "Docker installation (Not found)"
    fi
    
    # Test Docker Compose
    print_test "Testing: Docker Compose installation"
    if command -v docker-compose >/dev/null 2>&1; then
        local compose_version
        compose_version=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
        print_result "PASS" "Docker Compose installation (Version: $compose_version)"
    else
        print_result "FAIL" "Docker Compose installation (Not found)"
    fi
    
    # Test Nginx
    print_test "Testing: Nginx installation"
    if command -v nginx >/dev/null 2>&1; then
        local nginx_version
        nginx_version=$(nginx -v 2>&1 | cut -d' ' -f3 | cut -d'/' -f2)
        print_result "PASS" "Nginx installation (Version: $nginx_version)"
    else
        print_result "FAIL" "Nginx installation (Not found)"
    fi
    
    # Test Nginx status
    print_test "Testing: Nginx service status"
    if systemctl is-active --quiet nginx; then
        print_result "PASS" "Nginx service status (Active)"
    else
        print_result "FAIL" "Nginx service status (Inactive)"
    fi
    
    # Test Certbot
    print_test "Testing: Certbot installation"
    if command -v certbot >/dev/null 2>&1; then
        local certbot_version
        certbot_version=$(certbot --version 2>&1 | cut -d' ' -f2)
        print_result "PASS" "Certbot installation (Version: $certbot_version)"
    else
        print_result "FAIL" "Certbot installation (Not found)"
    fi
}

# =============================================================================
# DNS and Network Tests
# =============================================================================
test_dns_and_network() {
    echo
    echo "=============================================================================="
    echo "                        DNS AND NETWORK TESTS"
    echo "=============================================================================="
    
    # Test DNS resolution
    test_dns_resolution "$DOMAIN_FRONTEND" "Frontend DNS resolution"
    test_dns_resolution "$DOMAIN_BACKEND" "Backend DNS resolution"
    
    # Test network connectivity
    print_test "Testing: Internet connectivity"
    if ping -c 1 google.com >/dev/null 2>&1; then
        print_result "PASS" "Internet connectivity (Google reachable)"
    else
        print_result "FAIL" "Internet connectivity (No internet access)"
    fi
    
    # Test port availability
    print_test "Testing: Port 80 availability"
    if netstat -tuln | grep -q ":80 "; then
        print_result "PASS" "Port 80 availability (In use - expected)"
    else
        print_result "FAIL" "Port 80 availability (Not in use)"
    fi
    
    print_test "Testing: Port 443 availability"
    if netstat -tuln | grep -q ":443 "; then
        print_result "PASS" "Port 443 availability (In use - expected)"
    else
        print_result "FAIL" "Port 443 availability (Not in use)"
    fi
}

# =============================================================================
# Docker Container Tests
# =============================================================================
test_docker_containers() {
    echo
    echo "=============================================================================="
    echo "                        DOCKER CONTAINER TESTS"
    echo "=============================================================================="
    
    # Change to project directory
    if [ -d "$PROJECT_DIR" ]; then
        cd "$PROJECT_DIR"
    else
        print_error "Project directory not found: $PROJECT_DIR"
        return 1
    fi
    
    # Test individual containers
    test_docker_container "nextjs" "Next.js Frontend Container"
    test_docker_container "laravel-api" "Laravel API Container"
    test_docker_container "postgres" "PostgreSQL Database Container"
    test_docker_container "redis" "Redis Cache Container"
    test_docker_container "nginx" "Nginx Reverse Proxy Container"
    
    # Test container health
    print_test "Testing: Container health status"
    local unhealthy_containers
    unhealthy_containers=$(docker ps --filter "health=unhealthy" --format "{{.Names}}" | wc -l)
    
    if [ "$unhealthy_containers" -eq 0 ]; then
        print_result "PASS" "Container health status (All containers healthy)"
    else
        print_result "FAIL" "Container health status ($unhealthy_containers unhealthy containers)"
    fi
    
    # Test Docker Compose status
    print_test "Testing: Docker Compose services"
    if docker-compose ps | grep -q "Up"; then
        local running_services
        running_services=$(docker-compose ps | grep "Up" | wc -l)
        print_result "PASS" "Docker Compose services ($running_services services running)"
    else
        print_result "FAIL" "Docker Compose services (No services running)"
    fi
}

# =============================================================================
# SSL Certificate Tests
# =============================================================================
test_ssl_certificates() {
    echo
    echo "=============================================================================="
    echo "                        SSL CERTIFICATE TESTS"
    echo "=============================================================================="
    
    # Test SSL certificates
    test_ssl_certificate "$DOMAIN_FRONTEND" "Frontend SSL Certificate"
    test_ssl_certificate "$DOMAIN_BACKEND" "Backend SSL Certificate"
    
    # Test SSL file existence
    print_test "Testing: SSL certificate files"
    if [ -f "/etc/nginx/ssl/${DOMAIN_FRONTEND}.crt" ] && [ -f "/etc/nginx/ssl/${DOMAIN_FRONTEND}.key" ]; then
        print_result "PASS" "Frontend SSL files (Certificate and key found)"
    else
        print_result "FAIL" "Frontend SSL files (Certificate or key missing)"
    fi
    
    if [ -f "/etc/nginx/ssl/${DOMAIN_BACKEND}.crt" ] && [ -f "/etc/nginx/ssl/${DOMAIN_BACKEND}.key" ]; then
        print_result "PASS" "Backend SSL files (Certificate and key found)"
    else
        print_result "FAIL" "Backend SSL files (Certificate or key missing)"
    fi
    
    # Test SSL configuration
    print_test "Testing: Nginx SSL configuration"
    if nginx -t 2>/dev/null; then
        print_result "PASS" "Nginx SSL configuration (Valid)"
    else
        print_result "FAIL" "Nginx SSL configuration (Invalid)"
    fi
}

# =============================================================================
# Application Tests
# =============================================================================
test_application_endpoints() {
    echo
    echo "=============================================================================="
    echo "                        APPLICATION ENDPOINT TESTS"
    echo "=============================================================================="
    
    # Test HTTP to HTTPS redirect
    test_http_response "http://$DOMAIN_FRONTEND" "301" "Frontend HTTP to HTTPS redirect"
    test_http_response "http://$DOMAIN_BACKEND" "301" "Backend HTTP to HTTPS redirect"
    
    # Test HTTPS endpoints
    test_http_response "https://$DOMAIN_FRONTEND" "200" "Frontend HTTPS access"
    test_http_response "https://$DOMAIN_BACKEND" "200" "Backend HTTPS access"
    
    # Test health endpoints
    test_service_health "https://$DOMAIN_FRONTEND/health" "Frontend health endpoint"
    test_service_health "https://$DOMAIN_BACKEND/health" "Backend health endpoint"
    
    # Test API endpoints
    test_http_response "https://$DOMAIN_BACKEND/api" "200" "Backend API base endpoint" 10
    
    # Test CORS headers
    print_test "Testing: CORS headers"
    local cors_headers
    cors_headers=$(curl -s -H "Origin: https://$DOMAIN_FRONTEND" -I "https://$DOMAIN_BACKEND/api" 2>/dev/null | grep -i "access-control" | wc -l)
    
    if [ "$cors_headers" -gt 0 ]; then
        print_result "PASS" "CORS headers ($cors_headers headers found)"
    else
        print_result "FAIL" "CORS headers (No CORS headers found)"
    fi
}

# =============================================================================
# Performance Tests
# =============================================================================
test_performance() {
    echo
    echo "=============================================================================="
    echo "                        PERFORMANCE TESTS"
    echo "=============================================================================="
    
    # Test response time
    print_test "Testing: Frontend response time"
    local frontend_time
    frontend_time=$(curl -s -o /dev/null -w "%{time_total}" "https://$DOMAIN_FRONTEND" 2>/dev/null || echo "999")
    
    if (( $(echo "$frontend_time < 5.0" | bc -l) )); then
        print_result "PASS" "Frontend response time (${frontend_time}s)"
    else
        print_result "FAIL" "Frontend response time (${frontend_time}s - too slow)"
    fi
    
    print_test "Testing: Backend response time"
    local backend_time
    backend_time=$(curl -s -o /dev/null -w "%{time_total}" "https://$DOMAIN_BACKEND/health" 2>/dev/null || echo "999")
    
    if (( $(echo "$backend_time < 3.0" | bc -l) )); then
        print_result "PASS" "Backend response time (${backend_time}s)"
    else
        print_result "FAIL" "Backend response time (${backend_time}s - too slow)"
    fi
    
    # Test compression
    print_test "Testing: Gzip compression"
    local compression
    compression=$(curl -s -H "Accept-Encoding: gzip" -I "https://$DOMAIN_FRONTEND" 2>/dev/null | grep -i "content-encoding: gzip" | wc -l)
    
    if [ "$compression" -gt 0 ]; then
        print_result "PASS" "Gzip compression (Enabled)"
    else
        print_result "FAIL" "Gzip compression (Not enabled)"
    fi
}

# =============================================================================
# Security Tests
# =============================================================================
test_security() {
    echo
    echo "=============================================================================="
    echo "                        SECURITY TESTS"
    echo "=============================================================================="
    
    # Test security headers
    print_test "Testing: Security headers"
    local security_headers
    security_headers=$(curl -s -I "https://$DOMAIN_FRONTEND" 2>/dev/null | grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options|X-XSS-Protection)" | wc -l)
    
    if [ "$security_headers" -ge 3 ]; then
        print_result "PASS" "Security headers ($security_headers headers found)"
    else
        print_result "FAIL" "Security headers (Only $security_headers headers found)"
    fi
    
    # Test HSTS header
    print_test "Testing: HSTS header"
    if curl -s -I "https://$DOMAIN_FRONTEND" 2>/dev/null | grep -q "Strict-Transport-Security"; then
        print_result "PASS" "HSTS header (Present)"
    else
        print_result "FAIL" "HSTS header (Missing)"
    fi
    
    # Test server tokens
    print_test "Testing: Server tokens disclosure"
    if curl -s -I "https://$DOMAIN_FRONTEND" 2>/dev/null | grep -q "Server: nginx"; then
        print_result "FAIL" "Server tokens disclosure (Nginx version exposed)"
    else
        print_result "PASS" "Server tokens disclosure (Hidden)"
    fi
}

# =============================================================================
# Generate Test Report
# =============================================================================
generate_report() {
    echo
    echo "=============================================================================="
    echo "                        TEST REPORT SUMMARY"
    echo "=============================================================================="
    echo
    
    # Calculate success rate
    local success_rate=0
    if [ "$TOTAL_TESTS" -gt 0 ]; then
        success_rate=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    fi
    
    echo "📊 Test Statistics:"
    echo "   • Total Tests: $TOTAL_TESTS"
    echo "   • Passed: $PASSED_TESTS"
    echo "   • Failed: $FAILED_TESTS"
    echo "   • Success Rate: $success_rate%"
    echo
    
    # Show overall status
    if [ "$FAILED_TESTS" -eq 0 ]; then
        print_success "🎉 All tests passed! Deployment is healthy."
    elif [ "$success_rate" -ge 80 ]; then
        print_warning "⚠️  Most tests passed, but some issues detected."
    else
        print_error "❌ Multiple test failures detected. Please review the deployment."
    fi
    
    echo
    echo "📋 Detailed Results:"
    for result in "${TEST_RESULTS[@]}"; do
        if [[ "$result" =~ ^PASS ]]; then
            echo -e "   ${GREEN}✓${NC} ${result#PASS: }"
        else
            echo -e "   ${RED}✗${NC} ${result#FAIL: }"
        fi
    done
    
    echo
    echo "🔧 Useful Commands for Troubleshooting:"
    echo "   • Check containers: cd $PROJECT_DIR && docker-compose ps"
    echo "   • View logs: cd $PROJECT_DIR && docker-compose logs -f [service]"
    echo "   • Restart services: cd $PROJECT_DIR && docker-compose restart"
    echo "   • Check Nginx: nginx -t && systemctl status nginx"
    echo "   • Check SSL: openssl s_client -connect $DOMAIN_FRONTEND:443"
    echo "   • Test endpoints: curl -I https://$DOMAIN_FRONTEND"
    echo
    
    # Save report to file
    local report_file="/tmp/afms-test-report-$(date +%Y%m%d_%H%M%S).txt"
    {
        echo "AFMS Deployment Test Report"
        echo "Generated: $(date)"
        echo "Total Tests: $TOTAL_TESTS"
        echo "Passed: $PASSED_TESTS"
        echo "Failed: $FAILED_TESTS"
        echo "Success Rate: $success_rate%"
        echo
        echo "Detailed Results:"
        for result in "${TEST_RESULTS[@]}"; do
            echo "$result"
        done
    } > "$report_file"
    
    echo "📄 Test report saved to: $report_file"
    echo
}

# =============================================================================
# Main Testing Function
# =============================================================================
main() {
    echo
    echo "=============================================================================="
    echo "                    AFMS DEPLOYMENT TESTING SCRIPT"
    echo "              Comprehensive Testing & Verification"
    echo "=============================================================================="
    echo
    
    print_status "Starting comprehensive deployment tests..."
    print_status "Frontend Domain: $DOMAIN_FRONTEND"
    print_status "Backend Domain: $DOMAIN_BACKEND"
    print_status "Project Directory: $PROJECT_DIR"
    echo
    
    # Run all test suites
    test_system_requirements
    test_dns_and_network
    test_docker_containers
    test_ssl_certificates
    test_application_endpoints
    test_performance
    test_security
    
    # Generate final report
    generate_report
    
    # Exit with appropriate code
    if [ "$FAILED_TESTS" -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# =============================================================================
# Script Entry Point
# =============================================================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi