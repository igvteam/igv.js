#!/usr/bin/env python3
import argparse

def read_ids(filename):
    with open(filename, 'r') as f:
        return [line.strip() for line in f]

def replace_ids(sample_file, new_ids, output_file):
    with open(sample_file, 'r') as f:
        lines = f.readlines()
    
    with open(output_file, 'w') as f:
        # Write the comment line first
        f.write(lines[0])
        
        # Get the header line and split it
        header_parts = lines[1].strip().split('\t')
        # Replace the first column header with "Linking_id"
        header_parts[0] = "Linking_id"
        # Write the modified header
        f.write('\t'.join(header_parts) + '\n')
        
        # Write the data lines with new IDs
        for i, line in enumerate(lines[2:]):
            if i < len(new_ids):
                parts = line.strip().split('\t')
                parts[0] = new_ids[i]
                f.write('\t'.join(parts) + '\n')
            else:
                f.write(line)

def main():
    parser = argparse.ArgumentParser(description='Replace IDs in the first column of a sample table file')
    parser.add_argument('--ids', required=True, help='File containing the new IDs (one per line)')
    parser.add_argument('--input', required=True, help='Input sample table file to modify')
    parser.add_argument('--output', required=True, help='Output file path for the modified sample table')
    
    args = parser.parse_args()
    
    new_ids = read_ids(args.ids)
    replace_ids(args.input, new_ids, args.output)

if __name__ == '__main__':
    main() 