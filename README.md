# igv.js
![build](https://github.com/igvteam/igv.js/actions/workflows/ci_build.yml/badge.svg)
[![](https://img.shields.io/npm/dw/igv.svg)](https://www.npmjs.com/package/igv)
[![](https://img.shields.io/github/last-commit/igvteam/igv.js.svg)](https://github.com/igvteam/igv.js)
[![](https://img.shields.io/npm/l/igv.svg)](LICENSE)
[![](https://data.jsdelivr.com/v1/package/npm/igv/badge)](https://www.jsdelivr.com/package/npm/igv)

igv.js is an embeddable interactive genome visualization component developed by the 
 [Integrative Genomics Viewer (IGV)](https://igv.org) team. 

## Citing igv.js

James T Robinson, Helga Thorvaldsdottir, Douglass Turner, Jill P Mesirov, igv.js: an embeddable JavaScript 
implementation of the Integrative Genomics Viewer (IGV), Bioinformatics, Volume 39, Issue 1, January 2023, 
btac830, https://doi.org/10.1093/bioinformatics/btac830
 
Below are examples and a quickstart guide.  See the [developer documentation](https://igv.org/doc/igvjs) for more documentation.  

# Examples
 
***[Alignments](https://igv.org/web/release/3.1.2/examples/cram-vcf.html)***

***[Interactions](https://igv.org/web/release/3.1.2/examples/interact.html)***

***[Copy number](https://igv.org/web/release/3.1.2/examples/copyNumber.html)***

***[Multiple regions](https://igv.org/web/release/3.1.2/examples/multi-locus.html)***

***[Mutation Annotation Format (MAF)](https://igv.org/web/release/3.1.2/examples/maf-tcga.html)***

***[Variant color options](https://igv.org/web/release/3.1.2/examples/variant-colors.html)***

***[More](https://igv.org/web/release/3.1.2/examples/)***

 
# Quickstart

## Installation
igv.js consists of a single javascript file with no external dependencies.  

Pre-built files for script include, AMD, or CJS module systems (igv.min.js) and an ES6 module (igv.esm.min.js)
can be downloaded from [https://cdn.jsdelivr.net/npm/igv@3.1.2/dist/](https://cdn.jsdelivr.net/npm/igv@3.1.2/dist/). 

To import igv as an ES6 module

```javascript
import igv from "https://cdn.jsdelivr.net/npm/igv@3.1.2/dist/igv.esm.min.js"
``` 

Or as a script include (defines the "igv" global)

```html
<script src="https://cdn.jsdelivr.net/npm/igv@3.1.2/dist/igv.min.js"></script>
```   
 
Alternatively you can install with npm  
 
 ```npm install igv```

and source the appropriate file for your module system (igv.min.js or igv.esm.min.js)  in node_modules/igv/dist.


## Usage

To create an igv.js ***browser*** supply a container div 
and an initial configuration defining the reference genome, initial tracks, and other state to the 
function ```igv.createBrowser(div, config)```.  

This function returns a promise for an igv.Browser object which can used to control the browser.  For example, to open
a browser on a single alignment track opened at a specific locus:

```
      var igvDiv = document.getElementById("igv-div");
      var options =
        {
            genome: "hg38",
            locus: "chr8:127,736,588-127,739,371",
            tracks: [
                {
                    "name": "HG00103",
                    "url": "https://s3.amazonaws.com/1000genomes/data/HG00103/alignment/HG00103.alt_bwamem_GRCh38DH.20150718.GBR.low_coverage.cram",
                    "indexURL": "https://s3.amazonaws.com/1000genomes/data/HG00103/alignment/HG00103.alt_bwamem_GRCh38DH.20150718.GBR.low_coverage.cram.crai",
                    "format": "cram"
                }
            ]
        };

        igv.createBrowser(igvDiv, options)
                .then(function (browser) {
                    console.log("Created IGV browser");
                })
```

## Documentation

Full documentation of the igv.js API is available at [https://igv.org/doc/igvjs/](https://igv.org/doc/igvjs/).

## Development

### Requirements

Building igv.js and running the examples require Linux or MacOS.  Other Unix environments will probably
work but have not been tested.  

Windows users can use [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10).

### Building

Building igv.js and running the examples requires [node.js](https://nodejs.org/).


```  
git clone https://github.com/igvteam/igv.js.git
cd igv.js
npm install
npm run build
```

This creates a dist folder with the following files

* igv.js - UMDS file for script include, AMD, or CJS modules.  A script include will define an "igv" global.
* igv.min.js - minified version of igv.js
* igv.esm.js --  ES6 module 
* igv.esm.min.js --  minified version of igv.esm.js

### Tests

To run the tests from the command line

```
npm run test
```


### Examples

To run the examples install [http-server](https://www.npmjs.com/package/http-server).

Start  http-server from the project root directory

```bash
npx http-server 
```

Then open [http://localhost:8080/examples](http://localhost:8080/examples) in a web browser.


# Supported Browsers

igv.js require a modern web browser with support for Javascript ECMAScript 2015 (ES6). 

# License

igv.js is [MIT](/LICENSE) licensed.



### [Release Notes](https://github.com/igvteam/igv.js/releases)

 
