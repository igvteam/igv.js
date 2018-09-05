igv.js
=======


igv.js is an embeddable interactive genome visualization component developed by the 
 [Integrative Genomics Viewer (IGV)](https://igv.org) team.
 
 ***Examples***
 
***[Alignments viewer](http://igv.org/web/test/examples/bam.html)***

***[Copy number viewer](http://igv.org/web/test/examples/copyNumber.html)***

***[More](http://igv.org/web/test/examples)***
 
# Quickstart

## Installation
igv.js consists of a single javascript file with no external dependencies.  Pre-built expanded and minified js files 
can be downloaded from [http://igv.org/web/release](http://igv.org/web/release).    The current  release is
 [2.0.0-rc5](http://igv.org/web/release/2.0.0-rc5/dist/).  
 
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

## API

See the [Wiki](https://github.com/igvteam/igv.js/wiki) for full documentation of the API.


## Development

### Building

Building igv.js and running the examples requires [node.js](https://nodejs.org/).


```  
git clone https://github.com/igvteam/igv.js.git
npm install
grunt
```

This creates a dist folder with the following files

* igv.js, igv.min.js - ES5 compatible files for script or requirejs imports
* igv.esm.js,  igv.esm.min.js --  ES6 module 


### Tests

To run the tests start an [http-server](https://www.npmjs.com/package/http-server)

    http-server

Then open [http://localhost:8080/test/runTests.html](http://localhost:8080/test/runTests.html).


### Examples

To run the examples start an [http-server](https://www.npmjs.com/package/http-server)

    http-server

Then open [http://localhost:8080/index.html](http://localhost:8080/index.html).


## License

igv.js is [MIT](/LICENSE) licensed.

[documentation]: https://github.com/igvteam/igv.js/wiki
[examples]: http://igv.org/web/test/examples
