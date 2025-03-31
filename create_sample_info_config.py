import json
import os
import sys

def convert_sample_table(file_path):
    # Initialize the result dictionary
    result = {}
    
    # Read the file
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    # Skip the first line (starts with #)
    # Get the keys from the second line, ignoring the first item
    # Replace spaces with '|' in the keys
    keys = [key.replace(' ', '|') for key in lines[1].strip().split('\t')[1:]]
    
    # Process each line after the header
    for line in lines[2:]:
        if line.strip():  # Skip empty lines
            values = line.strip().split('\t')
            sample_id = values[0]
            
            # Create the dictionary for this sample
            sample_dict = {}
            
            # Map values to keys
            for i, key in enumerate(keys):
                value = values[i + 1]
                
                # Convert numeric values
                if value.replace('.', '').replace('-', '').isdigit():
                    value = float(value)
                
                # Handle the special case of empty MGMT_methylated
                if key == 'MGMT_methylated' and value == '':
                    value = '-'
                
                sample_dict[key] = value
            
            result[sample_id] = sample_dict
    
    return result

def save_as_javascript(result, output_path):
    # Create the directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Convert the result to a JavaScript object string
    js_content = "const sampleInfo = " + json.dumps(result, indent=4) + ";\n\nexport default sampleInfo;"
    
    # Write to file
    with open(output_path, 'w') as f:
        f.write(js_content)

def main():
    if len(sys.argv) != 3:
        print("Usage: python create_sample_info_config.py <input_file> <output_filename>")
        print("Example: python create_sample_info_config.py test/data/sample/sampletable_chr_17_only_names.txt sample_info_config.js")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_filename = sys.argv[2]
    
    # Convert the file
    result = convert_sample_table(input_file)
    
    # Save as JavaScript file
    output_path = os.path.join('dev/sampleInfo', output_filename)
    save_as_javascript(result, output_path)
    print(f"Sample info saved to {output_path}")

if __name__ == '__main__':
    main() 