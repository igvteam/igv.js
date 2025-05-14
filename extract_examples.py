import argparse
import os
from bs4 import BeautifulSoup
import re

def unindent(content):
    lines = content.splitlines()
    min_indent = None
    for line in lines:
        if line.strip():
            indent = len(line) - len(line.lstrip())
            if min_indent is None or indent < min_indent:
                min_indent = indent
    
    return "\n".join(line[min_indent:] for line in lines)

GET_ELEMENT_BY_ID_PATTERN = re.compile(r"document.getElementById\(([^)]+)\)")

def fix_getelementbyid(content):
    def repl(match):
        return f"(document.getElementById({match.group(1)}) as HTMLElement)"
    
    return GET_ELEMENT_BY_ID_PATTERN.sub(repl, content)

CONST_OPTIONS_PATTERN = re.compile(r"(const|var|let) options(\d*) ")

def fix_const_options(content):
    def repl(match):
        return f"{match.group(1)} options{match.group(2)}: CreateOpt "

    return CONST_OPTIONS_PATTERN.sub(repl, content)

CONST_TRACKS_PATTERN = re.compile(r"(const|var|let) tracks(\d*) ")

def fix_const_tracks(content):
    def repl(match):
        return f"{match.group(1)} tracks{match.group(2)}: TrackLoad<TrackType>[] "

    return CONST_TRACKS_PATTERN.sub(repl, content)

def process_html(html_path, dest_path):
    with open(html_path, 'r') as fp:
        soup = BeautifulSoup(fp, 'html.parser')
    
    script_tags = soup.find_all('script')

    if not script_tags:
        print(f"No script tags found in {html_path}")
    
    for i, script in enumerate(script_tags):
        if script.string:
            content = unindent(script.string)
            content = r"import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';" + "\n" + content

            content = content.replace("../../dist/igv.esm.min.js", "../js/igv")
            content = content.replace("../../dist/igv.esm.js", "../js/igv")
            content = fix_getelementbyid(content)
            content = fix_const_options(content)
            content = fix_const_tracks(content)
            content = content.replace("window.", "(window as any).")
            
            ts_path = os.path.join(dest_path, f"{os.path.basename(html_path)}_{i}.ts")
            with open(ts_path, 'w') as fp:
                fp.write(content)



def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('html_files', nargs='+', help='HTML files to process')
    args = parser.parse_args()
    
    dest_path = "examples_ts/"
    os.makedirs(dest_path, exist_ok=True)
    
    for html_path in args.html_files:
        dest_file_name = os.path.basename(html_path).replace(".html", ".ts")
        dest_file_path = os.path.join(dest_path, dest_file_name)
        os.makedirs(os.path.dirname(dest_file_path), exist_ok=True)

        process_html(html_path, dest_path)

if __name__ == "__main__":
    main()