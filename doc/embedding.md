<!-- Note: This document is written in "markdown".  Please respect the markdown conventions (http://daringfireball.net/projects/markdown/) when editig. -->


# Browser Initialization #

The IGV.js browser is a javascript object designd to be embedded in web pages.  The object is created and initialized with the function

    igv.createBrowser(div, config)

The first argument is the parent div, the browser object is inserted into the dom as a child of this object.
The second argument is an object defining configuration options.  The example below initializes igv with a single
annotation track:

        config = {
            showKaryo: false,
            showNavigation: true,
            reference: {
              fastaURL: "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/hg19.fasta",
              cytobandURL: "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/cytoBand.txt"
            }
            tracks: [
                {
                    url: "//dn7ywbm9isq8j.cloudfront.net/annotations/hg19/genes/gencode.v18.collapsed.bed",
                    label: "Genes",
                    order: 10000
                }
            ]
        };

        browser = igv.createBrowser(div, options);

The complete set of configuration options is documented [here](configuration.html).

Example web pages illustrating embedding are available [here](//igv.org/web/examples).

After creation, client pages interact with the browser through the singleton "igv.browser" object.  Typical interactions include
creating of new tracks and navigation.  The complete api is documented [here](api.html).


## Dependencies ##


#### Google Fonts ####

IGV.js is designed to work well with the following Google fonts: PT Sans and Open Sans.  Inclusion of these fonts
is recommended but not required.

`<link rel="stylesheet" type="text/css" href='//fonts.googleapis.com/css?family=PT+Sans:400,700'>`
`<link rel="stylesheet" type="text/css" href='//fonts.googleapis.com/css?family=Open+Sans'>`

#### jQuery UI CSS ####

A jQuery UI theme is required, the example below uses the "smoothness" theme.

`<link rel="stylesheet" type="text/css" href="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/themes/smoothness/jquery-ui.css"/>`

#### Font Awesome CSS ####

Icons are implemented using Font Awesome

 `<link rel="stylesheet" type="text/css" href="//maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css">`

#### IGV CSS ####

 `<link rel="stylesheet" type="text/css" href="//igv.org/web/beta/igv-beta.css">`


####jQuery JS####

`<script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>`

####jQuery UI JS####

`<script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/jquery-ui.min.js"></script>`


####IGV JS####

 `<script type="text/javascript" src="//igv.org/web/beta/igv-beta.js"></script>`


### The complete package -- cut and paste ###

    <link rel="stylesheet" type="text/css" href="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/themes/smoothness/jquery-ui.css"/>
    <link rel="stylesheet" type="text/css" href="//maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css">
    <link rel="stylesheet" type="text/css" href="//igv.org/web/beta/igv-beta.css">
    <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
    <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.2/jquery-ui.min.js"></script>
    <script type="text/javascript" src="//igv.org/web/beta/igv-beta.js"></script>
    