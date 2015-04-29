<!-- Note: This document is written in "markdown".  Please respect the markdown conventions (http://daringfireball.net/projects/markdown/) when editig. -->


#Browser Initialization#

Client pages interact with IGV through the singleton "igv.browser" object.  The object is created and initialized with the function

    igv.createBrowser(div, options)

The first argument is the parent div. IGV  inserts itself into the dom here. The second argument is an object
defining  configuration options, described.  The following example shows initialization with two tracks:  genomic sequence and gene annotations.

        options = {
            showKaryo: false,
            showNavigation: true,
            fastaURL: "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/hg19.fasta",
            cytobandURL: "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/cytoBand.txt",
            tracks: [
                {
                    type: "sequence"
                    order: 9999
                },
                {
                    url: "//dn7ywbm9isq8j.cloudfront.net/annotations/hg19/genes/gencode.v18.collapsed.bed",
                    label: "Genes",
                    order: 10000
                }
            ]
        };

        browser = igv.createBrowser(div, options);


##Dependancies##
These are the external links IGV-Web is dependant on:

####jQuery####
Javascript
`<script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>`

####jQuery UI####
CSS
`<link rel="stylesheet" type="text/css" href="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/themes/smoothness/jquery-ui.css"/>`

Javascript
`<script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/jquery-ui.min.js"></script>`

####Google Fonts####
App typography relies on the following Google fonts PT Sans and Open Sans:
`<link rel="stylesheet" type="text/css" href='//fonts.googleapis.com/css?family=PT+Sans:400,700'>`
 `<link rel="stylesheet" type="text/css" href='//fonts.googleapis.com/css?family=Open+Sans'>`

####Font Awesome####
All icons are implemented using Font Awesome
`<link rel="stylesheet" type="text/css" href="//maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css">`


