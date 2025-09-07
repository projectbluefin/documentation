#!/bin/bash

# GitHub API Utilities with Enhanced Error Handling
# This script provides robust GitHub API functions with comprehensive error handling,
# rate limiting, authentication validation, and debugging support.

# Configuration
DEFAULT_MAX_RETRIES=3
DEFAULT_RETRY_DELAY=5
DEBUG_MODE=${DEBUG_MODE:-false}
VERBOSE_MODE=${VERBOSE_MODE:-false}

# Rate limiting configuration
RATE_LIMIT_BUFFER=10  # Keep this many requests in reserve
MAX_WAIT_TIME=3600    # Maximum time to wait for rate limit reset (1 hour)

# Error codes for different failure types
readonly ERROR_AUTHENTICATION=10
readonly ERROR_RATE_LIMIT=11
readonly ERROR_NOT_FOUND=12
readonly ERROR_NETWORK=13
readonly ERROR_INVALID_RESPONSE=14
readonly ERROR_REPOSITORY_ACCESS=15

# Logging functions
log_debug() {
    if [[ "$DEBUG_MODE" == "true" ]]; then
        echo "[DEBUG] $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
    fi
}

log_verbose() {
    if [[ "$VERBOSE_MODE" == "true" || "$DEBUG_MODE" == "true" ]]; then
        echo "[VERBOSE] $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
    fi
}

log_info() {
    echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

log_warn() {
    echo "[WARN] $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

log_error() {
    echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

# Function to check if GitHub CLI is available and authenticated
check_github_auth() {
    log_debug "Checking GitHub CLI availability and authentication..."
    
    # Check if gh CLI is available
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed or not in PATH"
        log_error "Please install GitHub CLI: https://cli.github.com/"
        return $ERROR_AUTHENTICATION
    fi
    
    # Check authentication
    if ! gh auth status >/dev/null 2>&1; then
        log_error "GitHub CLI is not authenticated"
        log_error "Please run 'gh auth login' first"
        log_error "Or set the GH_TOKEN environment variable"
        return $ERROR_AUTHENTICATION
    fi
    
    log_verbose "✅ GitHub CLI authentication verified"
    return 0
}

# Function to check API rate limits
check_rate_limits() {
    log_debug "Checking GitHub API rate limits..."
    
    local rate_limit_info
    if ! rate_limit_info=$(gh api rate_limit 2>&1); then
        log_warn "Unable to check rate limits: $rate_limit_info"
        return 1
    fi
    
    local core_remaining
    local core_reset_time
    core_remaining=$(echo "$rate_limit_info" | jq -r '.rate.remaining')
    core_reset_time=$(echo "$rate_limit_info" | jq -r '.rate.reset')
    
    log_verbose "Rate limit status: $core_remaining requests remaining"
    
    # Check if we're approaching rate limits
    if [[ "$core_remaining" -lt "$RATE_LIMIT_BUFFER" ]]; then
        local reset_date
        reset_date=$(date -d "@$core_reset_time" 2>/dev/null || date -r "$core_reset_time" 2>/dev/null || echo "unknown")
        log_warn "⚠️ Rate limit low: $core_remaining requests remaining"
        log_warn "Rate limit resets at: $reset_date"
        
        # Calculate wait time if we're out of requests
        if [[ "$core_remaining" -eq 0 ]]; then
            local current_time wait_time
            current_time=$(date +%s)
            wait_time=$((core_reset_time - current_time))
            
            if [[ $wait_time -gt 0 && $wait_time -lt $MAX_WAIT_TIME ]]; then
                log_warn "⏰ Rate limit exceeded. Waiting ${wait_time}s for reset..."
                sleep "$wait_time"
                return 0
            else
                log_error "Rate limit exceeded and reset time is too far away"
                return $ERROR_RATE_LIMIT
            fi
        fi
    fi
    
    return 0
}

# Function to validate repository accessibility
validate_repository_access() {
    local repo="$1"
    
    log_debug "Validating access to repository: $repo"
    
    local repo_info
    if repo_info=$(gh api "repos/$repo" 2>&1); then
        local repo_name full_name
        repo_name=$(echo "$repo_info" | jq -r '.name // "unknown"')
        full_name=$(echo "$repo_info" | jq -r '.full_name // "unknown"')
        
        log_verbose "✅ Repository accessible: $full_name ($repo_name)"
        return 0
    else
        local error_msg
        error_msg=$(echo "$repo_info" | jq -r '.message // "unknown error"' 2>/dev/null || echo "$repo_info")
        
        if echo "$error_msg" | grep -qi "not found"; then
            log_error "❌ Repository not found: $repo"
            return $ERROR_NOT_FOUND
        elif echo "$error_msg" | grep -qi "bad credentials\|unauthorized"; then
            log_error "❌ Authentication failed for repository: $repo"
            return $ERROR_AUTHENTICATION
        else
            log_error "❌ Unable to access repository $repo: $error_msg"
            return $ERROR_REPOSITORY_ACCESS
        fi
    fi
}

# Function to make GitHub API calls with retry logic and error handling
github_api_call() {
    local endpoint="$1"
    local max_retries="${2:-$DEFAULT_MAX_RETRIES}"
    local retry_delay="${3:-$DEFAULT_RETRY_DELAY}"
    
    log_debug "Making GitHub API call to: $endpoint"
    log_debug "Max retries: $max_retries, Retry delay: ${retry_delay}s"
    
    # Check authentication first
    if ! check_github_auth; then
        return $ERROR_AUTHENTICATION
    fi
    
    # Check rate limits
    if ! check_rate_limits; then
        return $ERROR_RATE_LIMIT
    fi
    
    local attempt=1
    local current_delay="$retry_delay"
    
    while [[ $attempt -le $max_retries ]]; do
        log_verbose "API call attempt $attempt/$max_retries to: $endpoint"
        
        local result http_status error_info
        
        # Make the API call and capture both output and potential errors
        if result=$(gh api "$endpoint" --paginate 2>&1); then
            # Success - validate the response is valid JSON
            if echo "$result" | jq empty 2>/dev/null; then
                log_debug "✅ API call successful on attempt $attempt"
                echo "$result"
                return 0
            else
                log_warn "⚠️ API call returned invalid JSON on attempt $attempt"
                error_info="Invalid JSON response"
            fi
        else
            # Extract error information
            error_info="$result"
            
            # Check for specific error types
            if echo "$error_info" | grep -qi "rate limit\|forbidden.*rate"; then
                log_warn "⚠️ Rate limit hit on attempt $attempt"
                if ! check_rate_limits; then
                    return $ERROR_RATE_LIMIT
                fi
            elif echo "$error_info" | grep -qi "not found"; then
                log_error "❌ Resource not found: $endpoint"
                return $ERROR_NOT_FOUND
            elif echo "$error_info" | grep -qi "bad credentials\|unauthorized"; then
                log_error "❌ Authentication failed for: $endpoint"
                return $ERROR_AUTHENTICATION
            elif echo "$error_info" | grep -qi "network\|connection\|timeout"; then
                log_warn "⚠️ Network error on attempt $attempt: $error_info"
            else
                log_warn "⚠️ API call failed on attempt $attempt: $error_info"
            fi
        fi
        
        # Exponential backoff for retries
        if [[ $attempt -lt $max_retries ]]; then
            log_verbose "⏳ Retrying in ${current_delay}s..."
            sleep "$current_delay"
            current_delay=$((current_delay * 2))  # Exponential backoff
            ((attempt++))
        else
            break
        fi
    done
    
    log_error "❌ API call failed after $max_retries attempts: $endpoint"
    log_error "Last error: $error_info"
    return $ERROR_NETWORK
}

# Function to fetch releases with enhanced filtering and error handling
fetch_releases_with_filter() {
    local repo="$1"
    local jq_filter="$2"
    local max_retries="${3:-$DEFAULT_MAX_RETRIES}"
    
    log_info "Fetching releases from $repo with filter..."
    log_debug "JQ Filter: $jq_filter"
    
    # Validate repository access first
    if ! validate_repository_access "$repo"; then
        return $?
    fi
    
    # Fetch releases
    local releases_json
    if releases_json=$(github_api_call "repos/$repo/releases" "$max_retries"); then
        # Apply filter and validate results
        local filtered_releases
        if filtered_releases=$(echo "$releases_json" | jq "$jq_filter" 2>&1); then
            local count
            count=$(echo "$filtered_releases" | jq length 2>/dev/null || echo "0")
            log_verbose "✅ Found $count releases matching filter from $repo"
            echo "$filtered_releases"
            return 0
        else
            log_error "❌ Filter application failed: $filtered_releases"
            return $ERROR_INVALID_RESPONSE
        fi
    else
        local exit_code=$?
        log_error "❌ Failed to fetch releases from $repo"
        return $exit_code
    fi
}

# Function to fetch a specific release by tag
fetch_release_by_tag() {
    local repo="$1"
    local tag="$2"
    local max_retries="${3:-$DEFAULT_MAX_RETRIES}"
    
    log_info "Fetching release $tag from $repo..."
    
    # Validate repository access first
    if ! validate_repository_access "$repo"; then
        return $?
    fi
    
    # Fetch specific release
    local release_json
    if release_json=$(github_api_call "repos/$repo/releases/tags/$tag" "$max_retries"); then
        # Validate it's a proper release object
        if echo "$release_json" | jq -e '.tag_name' >/dev/null 2>&1; then
            log_verbose "✅ Successfully fetched release $tag from $repo"
            echo "$release_json"
            return 0
        else
            log_error "❌ Invalid release data for $tag from $repo"
            return $ERROR_INVALID_RESPONSE
        fi
    else
        local exit_code=$?
        log_error "❌ Failed to fetch release $tag from $repo"
        return $exit_code
    fi
}

# Function to provide actionable error suggestions
suggest_error_resolution() {
    local error_code="$1"
    local context="${2:-}"
    
    log_info "💡 Troubleshooting suggestions:"
    
    case $error_code in
        $ERROR_AUTHENTICATION)
            echo "  • Run 'gh auth login' to authenticate with GitHub"
            echo "  • Set GH_TOKEN environment variable with a valid token"
            echo "  • Ensure token has appropriate repository permissions"
            ;;
        $ERROR_RATE_LIMIT)
            echo "  • Wait for rate limit to reset (check 'gh api rate_limit')"
            echo "  • Use a different authentication token"
            echo "  • Reduce the frequency of API calls"
            ;;
        $ERROR_NOT_FOUND)
            echo "  • Verify repository name is correct: $context"
            echo "  • Check if repository exists and is accessible"
            echo "  • Ensure you have read permissions to the repository"
            ;;
        $ERROR_NETWORK)
            echo "  • Check internet connectivity"
            echo "  • Verify GitHub API is accessible"
            echo "  • Try again later if there are GitHub outages"
            ;;
        $ERROR_REPOSITORY_ACCESS)
            echo "  • Verify repository permissions"
            echo "  • Check if repository has been moved or renamed"
            echo "  • Ensure authentication token has access to: $context"
            ;;
        *)
            echo "  • Check GitHub API status: https://status.github.com/"
            echo "  • Verify all parameters are correct"
            echo "  • Enable debug mode with DEBUG_MODE=true for more details"
            ;;
    esac
}

# Function to perform comprehensive API health check
api_health_check() {
    log_info "🔍 Performing GitHub API health check..."
    
    local health_status=0
    
    # Check authentication
    if check_github_auth; then
        log_info "✅ Authentication: OK"
    else
        log_error "❌ Authentication: FAILED"
        health_status=1
    fi
    
    # Check rate limits
    if check_rate_limits; then
        log_info "✅ Rate limits: OK"
    else
        log_error "❌ Rate limits: FAILED"
        health_status=1
    fi
    
    # Test API connectivity
    if github_api_call "rate_limit" 1 1 >/dev/null 2>&1; then
        log_info "✅ API connectivity: OK"
    else
        log_error "❌ API connectivity: FAILED"
        health_status=1
    fi
    
    if [[ $health_status -eq 0 ]]; then
        log_info "🎉 GitHub API health check passed"
    else
        log_error "💥 GitHub API health check failed"
        suggest_error_resolution $ERROR_NETWORK
    fi
    
    return $health_status
}

# Export functions for use in other scripts
export -f log_debug log_verbose log_info log_warn log_error
export -f check_github_auth check_rate_limits validate_repository_access
export -f github_api_call fetch_releases_with_filter fetch_release_by_tag
export -f suggest_error_resolution api_health_check