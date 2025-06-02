#!/usr/bin/env python3
import os
import re
from pathlib import Path

def update_imports(directory):
    # Pattern to match any legacy import style with node_modules
    legacy_pattern = re.compile(r'from\s+[\'"]\.*\/node_modules\/igv-utils\/src\/index\.js[\'"]')
    
    # Counter for modified files
    modified_files = 0
    
    # Walk through all files in the directory
    for root, _, files in os.walk(directory):
        for file in files:
            # Only process JavaScript and TypeScript files
            if file.endswith(('.js', '.ts', '.jsx', '.tsx')):
                file_path = os.path.join(root, file)
                
                # Skip the update_imports.py file itself
                if file == 'update_imports.py':
                    continue
                    
                # Read the file content
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check if the file contains legacy imports
                if 'node_modules/igv-utils' in content:
                    # Replace the legacy import with the modern one
                    new_content = re.sub(
                        r'from\s+[\'"]\.*\/node_modules\/igv-utils\/src\/index\.js[\'"]',
                        'from \'igv-utils\'',
                        content
                    )
                    
                    # Only write if there were actual changes
                    if new_content != content:
                        # Write the updated content back to the file
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        
                        print(f"Updated imports in: {file_path}")
                        modified_files += 1
    
    return modified_files

if __name__ == "__main__":
    # Get the current directory
    current_dir = os.getcwd()
    
    print("Starting import updates...")
    modified_count = update_imports(current_dir)
    print(f"\nUpdate complete! Modified {modified_count} files.") 