# GitHub API Error Handling Improvements

This document describes the enhanced error handling capabilities added to the Bluefin documentation changelog synchronization system.

## Overview

The changelog synchronization system has been enhanced with comprehensive error handling for GitHub API requests, including:

- **Rate limit detection and handling**
- **Authentication verification**
- **Repository accessibility validation**
- **Exponential backoff retry logic**
- **Comprehensive logging and debugging**
- **Actionable error suggestions**
- **Changelog file regeneration options**

## New Error Handling Features

### 1. GitHub API Utilities (`scripts/github_api_utils.sh`)

A new shared utility script that provides:

- **Authentication checks**: Validates GitHub CLI authentication before making API calls
- **Rate limit monitoring**: Checks remaining API quota and waits for reset when needed
- **Repository validation**: Verifies repository accessibility and permissions
- **Enhanced API calls**: Robust API request function with retry logic and error categorization
- **Comprehensive logging**: Debug, verbose, info, warn, and error logging levels
- **Error suggestions**: Actionable troubleshooting suggestions for different error types

### 2. Enhanced Process Single Release Script

Improvements to `scripts/process_single_release.sh`:

- **Force regeneration option**: `--force-regenerate` flag to overwrite existing changelog files
- **Environment variable support**: `FORCE_REGENERATE_CHANGELOGS=true` for automated scenarios
- **Enhanced logging**: Detailed logging throughout the process
- **Better error reporting**: Clear error messages with suggestions

### 3. Improved Catch-up Script

Updates to `scripts/catch_up_releases.sh`:

- **Command line options**: Support for `--force-regenerate`, `--debug`, `--verbose` flags
- **Better error tracking**: Separate counts for processed, skipped, and failed releases
- **Health checks**: API connectivity verification before processing
- **Enhanced filtering**: Robust release filtering with error handling

### 4. Main Workflow Enhancements

The GitHub workflow (`sync-bluefin-releases.yml`) now includes:

- **API health checks**: Verify GitHub API connectivity before processing
- **Repository validation**: Check access to all repositories before fetching data
- **Enhanced error reporting**: Detailed error messages with troubleshooting suggestions
- **Graceful degradation**: Continue processing available repositories when others fail

## Error Types and Handling

### Authentication Errors (Code: 10)
- **Detection**: Invalid or missing GitHub token
- **Handling**: Clear error message with authentication instructions
- **Suggestions**: Run `gh auth login` or set `GH_TOKEN` environment variable

### Rate Limit Errors (Code: 11)
- **Detection**: API rate limits exceeded
- **Handling**: Automatic waiting for rate limit reset (up to 1 hour)
- **Suggestions**: Use different token or reduce API call frequency

### Not Found Errors (Code: 12)
- **Detection**: Repository or release not found
- **Handling**: Skip missing items with clear logging
- **Suggestions**: Verify repository names and accessibility

### Network Errors (Code: 13)
- **Detection**: Connection timeouts or network issues
- **Handling**: Exponential backoff retry (up to 3 attempts)
- **Suggestions**: Check connectivity and GitHub API status

### Invalid Response Errors (Code: 14)
- **Detection**: Malformed or unexpected API responses
- **Handling**: Validation and re-attempts
- **Suggestions**: Check API endpoint and data format

### Repository Access Errors (Code: 15)
- **Detection**: Permission or access issues
- **Handling**: Clear error reporting with repository context
- **Suggestions**: Verify permissions and repository existence

## Usage Examples

### Force Regenerate Existing Changelogs

```bash
# Regenerate changelogs for the last 7 days
./scripts/catch_up_releases.sh 7 --force-regenerate

# Regenerate with debug logging
./scripts/catch_up_releases.sh 14 --force-regenerate --debug

# Process single release with force regeneration
./scripts/process_single_release.sh "ublue-os/bluefin" "stable-20250907" "..." "..." "..." "..." "false" "" --force-regenerate
```

### Enable Debug Logging

```bash
# Set environment variables for detailed logging
export DEBUG_MODE=true
export VERBOSE_MODE=true

# Run catch-up script with debugging
./scripts/catch_up_releases.sh --debug --verbose
```

### API Health Check

```bash
# Source utilities and run health check
source scripts/github_api_utils.sh
api_health_check
```

## Configuration Options

### Environment Variables

- `DEBUG_MODE=true`: Enable debug logging
- `VERBOSE_MODE=true`: Enable verbose logging  
- `FORCE_REGENERATE_CHANGELOGS=true`: Force regeneration of existing files
- `GH_TOKEN`: GitHub API token for authentication

### Configurable Parameters

- `DEFAULT_MAX_RETRIES=3`: Maximum retry attempts for API calls
- `DEFAULT_RETRY_DELAY=5`: Initial delay between retries (seconds)
- `RATE_LIMIT_BUFFER=10`: Keep this many API requests in reserve
- `MAX_WAIT_TIME=3600`: Maximum time to wait for rate limit reset

## Error Resolution Guide

### Common Issues and Solutions

1. **Authentication Failed**
   ```bash
   gh auth login
   # OR
   export GH_TOKEN="your_token_here"
   ```

2. **Rate Limit Exceeded**
   ```bash
   # Check current rate limit status
   gh api rate_limit
   
   # Wait for reset or use different token
   ```

3. **Repository Not Found**
   ```bash
   # Verify repository name and access
   gh repo view ublue-os/bluefin
   ```

4. **Network Connectivity**
   ```bash
   # Check GitHub API status
   curl -s https://status.github.com/api/status.json
   ```

## Monitoring and Debugging

### Log Levels

- **DEBUG**: Detailed internal operations
- **VERBOSE**: Detailed process information  
- **INFO**: General informational messages
- **WARN**: Warning conditions that don't prevent operation
- **ERROR**: Error conditions that prevent operation

### Health Check Output

The `api_health_check` function provides comprehensive status:

```bash
[INFO] 🔍 Performing GitHub API health check...
[INFO] ✅ Authentication: OK
[INFO] ✅ Rate limits: OK  
[INFO] ✅ API connectivity: OK
[INFO] 🎉 GitHub API health check passed
```

## Future Enhancements

- **Metrics collection**: Track error rates and API usage
- **Alert integration**: Notify on persistent failures
- **Automatic recovery**: Self-healing for common issues
- **Performance optimization**: Caching and request batching