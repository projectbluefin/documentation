#!/usr/bin/env python3

"""
Script to download GitHub user-attachment images to local static directory
This Python version handles redirects and may work better in restricted environments
"""

import os
import re
import subprocess
import requests
from pathlib import Path
import mimetypes

# Directories
SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent
STATIC_IMG_DIR = ROOT_DIR / 'static' / 'img' / 'user-attachments'
DOCS_DIR = ROOT_DIR / 'docs'
BLOG_DIR = ROOT_DIR / 'blog'

# Create the user-attachments directory if it doesn't exist
STATIC_IMG_DIR.mkdir(parents=True, exist_ok=True)

def extract_user_attachment_urls():
    """Extract all unique GitHub user-attachment URLs from markdown files"""
    url_pattern = r'https://github\.com/user-attachments/assets/[a-f0-9-]+'
    
    try:
        # Use grep to find all URLs
        cmd = f'grep -rhoE "{url_pattern}" {DOCS_DIR} {BLOG_DIR} | sort -u'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        urls = [url.strip() for url in result.stdout.strip().split('\n') if url.strip()]
        print(f'Found {len(urls)} unique user-attachment URLs')
        return urls
    except Exception as e:
        print(f'Error extracting URLs: {e}')
        return []

def get_extension_from_content_type(content_type):
    """Get file extension from content type"""
    ext = mimetypes.guess_extension(content_type)
    if ext:
        return ext.lstrip('.')
    
    # Fallback mappings
    type_map = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
    }
    return type_map.get(content_type, 'png')

def download_image(url, session):
    """Download a single image"""
    uuid = url.split('/')[-1]
    
    try:
        print(f'Downloading {uuid}...', end=' ')
        
        # Follow redirects and download
        response = session.get(url, allow_redirects=True, timeout=30)
        response.raise_for_status()
        
        # Determine file extension from content type
        content_type = response.headers.get('content-type', 'image/png')
        ext = get_extension_from_content_type(content_type)
        
        # Save the file
        file_path = STATIC_IMG_DIR / f'{uuid}.{ext}'
        with open(file_path, 'wb') as f:
            f.write(response.content)
        
        print(f'✓ Saved as {uuid}.{ext} ({len(response.content)} bytes)')
        return {'uuid': uuid, 'ext': ext, 'url': url}
        
    except requests.exceptions.RequestException as e:
        print(f'✗ Failed: {e}')
        return None
    except Exception as e:
        print(f'✗ Error: {e}')
        return None

def main():
    print('Starting GitHub user-attachment image download...\n')
    
    urls = extract_user_attachment_urls()
    
    if not urls:
        print('No user-attachment URLs found.')
        return
    
    # Create a session with retry logic
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    
    results = []
    failed = []
    
    for url in urls:
        result = download_image(url, session)
        if result:
            results.append(result)
        else:
            failed.append(url)
    
    print('\n--- Summary ---')
    print(f'Total URLs: {len(urls)}')
    print(f'Successfully downloaded: {len(results)}')
    print(f'Failed: {len(failed)}')
    
    if failed:
        print('\nFailed URLs:')
        for url in failed:
            print(f'  - {url}')
    
    # Save mapping file
    import json
    mapping_file = STATIC_IMG_DIR / 'url-mapping.json'
    mapping = {r['url']: f"/img/user-attachments/{r['uuid']}.{r['ext']}" for r in results}
    
    with open(mapping_file, 'w') as f:
        json.dump(mapping, f, indent=2)
    
    print(f'\nURL mapping saved to: {mapping_file}')
    print('\nDownload complete!')

if __name__ == '__main__':
    main()
