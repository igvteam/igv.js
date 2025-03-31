#!/usr/bin/env python3

def remove_duplicates(input_file, output_file):
    # Set to keep track of seen IDs
    seen_ids = set()
    
    # Read input and write output
    with open(input_file, 'r') as infile, open(output_file, 'w') as outfile:
        for line in infile:
            # Split the line by tab to get the ID (first column)
            parts = line.strip().split('\t')
            if not parts:  # Skip empty lines
                continue
                
            id_value = parts[0]
            
            # If this is the header line or we haven't seen this ID before, write it
            if id_value.startswith('#') or id_value not in seen_ids:
                outfile.write(line)
                if not id_value.startswith('#'):  # Don't add header to seen_ids
                    seen_ids.add(id_value)

if __name__ == "__main__":
    input_file = "test/data/sample/sampletable_chr_17_names_only_dupes.txt"
    output_file = "test/data/sample/sampletable_chr_17_no_dupes.txt"
    remove_duplicates(input_file, output_file)
    print(f"Removed duplicates from {input_file} and saved to {output_file}") 