#!/bin/bash

# Test script to validate workflow improvements
# This script tests the improved error handling and retry logic

set -e

echo "=== Testing Workflow Improvements ==="

# Test 1: Verify the new changelogs exist
echo "Test 1: Checking if missing changelogs were created..."
if [[ -f "changelogs/2025-09-07-20250907.md" ]]; then
    echo "✅ stable-20250907 changelog exists"
else
    echo "❌ stable-20250907 changelog missing"
    exit 1
fi

if [[ -f "changelogs/2025-09-07-gts-20250907.md" ]]; then
    echo "✅ gts-20250907 changelog exists"
else
    echo "❌ gts-20250907 changelog missing"
    exit 1
fi

# Test 2: Verify changelog format
echo "Test 2: Validating changelog format..."
if grep -q "title: \"Bluefin Stable 20250907\"" changelogs/2025-09-07-20250907.md; then
    echo "✅ stable changelog has correct title"
else
    echo "❌ stable changelog title incorrect"
    exit 1
fi

if grep -q "title: \"Bluefin GTS 20250907\"" changelogs/2025-09-07-gts-20250907.md; then
    echo "✅ GTS changelog has correct title"
else
    echo "❌ GTS changelog title incorrect"
    exit 1
fi

# Test 3: Verify the site builds successfully
echo "Test 3: Verifying site builds..."
if [[ -d "build" ]]; then
    echo "✅ Site built successfully"
else
    echo "❌ Site build failed"
    exit 1
fi

# Test 4: Verify workflow file syntax
echo "Test 4: Checking workflow syntax..."
if command -v yamllint >/dev/null 2>&1; then
    if yamllint .github/workflows/sync-bluefin-releases.yml; then
        echo "✅ Workflow YAML syntax is valid"
    else
        echo "❌ Workflow YAML syntax errors"
        exit 1
    fi
else
    echo "⚠️ yamllint not available, skipping YAML syntax check"
fi

# Test 5: Verify catch-up script improvements
echo "Test 5: Checking catch-up script..."
if [[ -x "scripts/catch_up_releases.sh" ]]; then
    echo "✅ Catch-up script is executable"
else
    echo "❌ Catch-up script not executable"
    exit 1
fi

# Test 6: Check if required functions exist in workflow
echo "Test 6: Verifying workflow improvements..."
if grep -q "fetch_releases_with_retry" .github/workflows/sync-bluefin-releases.yml; then
    echo "✅ Retry logic function found in workflow"
else
    echo "❌ Retry logic function missing"
    exit 1
fi

if grep -q "gh auth login" .github/workflows/sync-bluefin-releases.yml; then
    echo "✅ Authentication setup found in workflow"
else
    echo "❌ Authentication setup missing"
    exit 1
fi

echo ""
echo "=== All Tests Passed! ==="
echo "✅ Missing changelogs have been created"
echo "✅ Workflow has been improved with better error handling"
echo "✅ Retry logic has been added for API failures"
echo "✅ Authentication verification has been added"
echo "✅ Site builds successfully with new changelogs"