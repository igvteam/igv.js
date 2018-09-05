igv.js
=======


igv.js is an embeddable interactive genome visualization component developed by the 
 [Integrative Genomics Viewer (IGV)](https://igv.org) team.
 
***[Try a demo](http://igv.org/web/release/2.0.0-rc5/examples/bam.html)***

***[More examples](http://igv.org/web/release/2.0.0-rc5/examples)***
 
# Quickstart

## Installation
igv.js consists of a single javascript file with no external dependencies.   You can install it by sourcing the
file with a script tag, for example

```<script src="igv.min.js/>```

as a requirejs module 

```requirejs(['igv.min'], function (igv) {...}```   *(see [examples/igv-require.html](http://igv.org/web/release/2.0.0-rc5/examples/igv-require.html))*

or as an es6 module 

```import igv from 'igv.esm.min.js'```  *(see [examples/igv-esm.html](http://igv.org/web/release/2.0.0-rc5/examples/igv-esm.html))*

Pre-built js files can be downloaded from [http://igv.org/web/release](http://igv.org/web/release).    The current 
release is [2.0.0-rc5](http://igv.org/web/release/2.0.0-rc5/dist/).

To install with npm

```npm install igv```

## Usage

igv.js exports an "igv" object which defines the API.   To embed an igv.js browser you suppy a container 
(usually a div) and an initial configuration defining the reference genome, initial tracks, and other state to the 
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

See the [Wiki](https://github.com/igvteam/igv.js/wiki) for full documentation of the API.

