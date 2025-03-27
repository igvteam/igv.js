#!/usr/bin/env python3

import sys
import os

def convert_sample_table(input_file, output_file):
    # Read the input file
    with open(input_file, 'r') as f:
        lines = f.readlines()
    
    # Skip the first line (#sampleTable)
    header_line = lines[1].strip()
    headers = header_line.split('\t')
    
    # Initialize the data structure
    data = {header: [] for header in headers}
    
    # Process each data line
    for line in lines[2:]:
        values = line.strip().split('\t')
        for header, value in zip(headers, values):
            data[header].append(value)
    
    # Create the JavaScript content
    js_content = "export const sampleData = {\n"
    for header in headers:
        # Replace spaces with underscores and handle special cases
        key = header.replace(" ", "_")
        if key == "Survival_(days)":
            key = "Survival"
        js_content += f'    "{key}": {data[header]},\n'
    js_content += "};\n"
    
    # Write to output file
    with open(output_file, 'w') as f:
        f.write(js_content)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_sample_table.py <input_file> <output_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' does not exist")
        sys.exit(1)
    
    convert_sample_table(input_file, output_file)
    print(f"Successfully converted {input_file} to {output_file}") 