# igv.js
[![Build Status](https://travis-ci.org/igvteam/igv.js.svg?branch=master)](https://travis-ci.org/igvteam/igv.js)

igv.js is an embeddable interactive genome visualization component developed by the 
 [Integrative Genomics Viewer (IGV)](https://igv.org) team. 
 
Below are examples and a quickstart guide.  
See the [Wiki](https://github.com/igvteam/igv.js/wiki) for more documentation.  

 
# Examples
 
***[Alignments](https://igv.org/web/test/examples/bam.html)***

***[GA4GH](https://igv.org/web/test/examples/ga4gh.html)***

***[Copy number](https://igv.org/web/test/examples/copyNumber.html)***

***[Multiple regions](http://igv.org/web/test/examples/multi-locus.html)***

***[More](http://igv.org/web/test/examples)***

 
# Quickstart

## Installation
igv.js consists of a single javascript file with no external dependencies.  To link directly to the current release copy this snippet

```html
<script src="https://igv.org/web/release/2.1/dist/igv.min.js"></script>
``` 

Pre-built expanded and minified js files for ES5 (igv.js, igv.min.js) and ES6 (igv.esm.js, igv.esm.min.js)
can be downloaded from [http://igv.org/web/release/2.1/dist](http://igv.org/web/release/2.0.0/dist).   
 
Alternatively you can install with npm  
 
 ```npm install igv```

and source one of the files in node_modules/igv/dist.

To use igv.js include it with a script tag

````<script src="igv.min.js/>````

***or*** import it as a requirejs module 

```requirejs(['igv.min'], function (igv) {...}```   *(see [examples/igv-require.html](http://igv.org/web/release/2.0.0-rc5/examples/igv-require.html))*

***or*** import it as an es6 module 

```import igv from 'igv.esm.min.js'```  *(see [examples/igv-esm.html](http://igv.org/web/release/2.0.0-rc5/examples/igv-esm.html))*



## Usage

To create an igv.js ***browser*** supply a container div 
and an initial configuration defining the reference genome, initial tracks, and other state to the 
function ```igv.createBrowser(div, config)```.  

This function returns a promise for an igv.Browser object which can used to control the browser.  An 
[example](http://igv.org/web/release/2.0.0-rc5/examples/bam.html) of
a browser on a single alignment track opened at a specific locus:

```
      var igvDiv = document.getElementById("igv-div");
      var options =
        {
            genome: "hg19",
            locus: "chr8:128,747,267-128,754,546",
            tracks: [
                {
                    type: 'alignment',
                    format: 'bam',
                    url: 'https://data.broadinstitute.org/igvdata/1KG/b37/data/HG02450/alignment/HG02450.mapped.ILLUMINA.bwa.ACB.low_coverage.20120522.bam',
                    name: 'HG02450'
                }
            ]
        };

        igv.createBrowser(igvDiv, options)
                .then(function (browser) {
                    console.log("Created IGV browser");
                })
```

For more details see the [Wiki](https://github.com/igvteam/igv.js/wiki) for full documentation of the API.

## Development

### Requirements

Building igv.js and running the examples require Linux or MacOS.  Other Unix environments will probably
work but have not been tested.  

Windows users can use [Cygwin](https://www.cygwin.com/) or 
 [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10).

### Building

Building igv.js and running the examples requires [node.js](https://nodejs.org/).


```  
git clone https://github.com/igvteam/igv.js.git
cd igv.js
npm install
npm run grunt
```

This creates a dist folder with the following files

* igv.js, igv.min.js - ES5 compatible files for script or requirejs imports
* igv.esm.js,  igv.esm.min.js --  ES6 module 


### Tests

To run the tests from the command line

```
    grunt test
```

To run the tests in a browser start an [http-server](https://www.npmjs.com/package/http-server)

    npm run http-server

Then open [http://localhost:8080/test/runTests.html](http://localhost:8080/test/runTests.html).


### Examples

To run the examples start an [http-server](https://www.npmjs.com/package/http-server)

    npm run http-server

Then open [http://localhost:8080/index.html](http://localhost:8080/index.html).


# Supported Browsers

igv-webapp and igv.js require a modern web browser with support for Javascript ECMAScript 2015. We test on the latest versions of Chrome, Safari, Firefox, and Edge. Internet Explorer (IE) is not supported.

# License

igv.js is [MIT](/LICENSE) licensed.

[documentation]: https://github.com/igvteam/igv.js/wiki
[examples]: http://igv.org/web/test/examples
