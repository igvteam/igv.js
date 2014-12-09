Note: This document is written in "markdown".  Please respect the [markdown conventions] (http://daringfireball.net/projects/markdown/) when editig.


Browser Initialization
======================

Client pages interact with IGV through the singleton "igv.browser" object.  The object is created and initialized with the function

    igv.createBrowser(div, options)
    
The first argument is the parent div,  IGV  inserts itself into the dom here. The second argument is an object
defining configuration options, described in more detail below.  

In the following example IGV is initialized with two initial tracks, genomic sequence and gene annotations.  


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
        
        
Configuration Options
---------------------
    
    showKaryo       optional    if true the whole-genome karyotype view is displayed. 
    showNavigation  optional    if true show basic navigation controls (search, zoom in, zoom out)
    fastaURL        required*   url to an indexed fasta file.  Required if genome id is not specified.
    cytobandURL     required*   url to a cytoband file in UCSC format.  Required if genome id is not specified.
    genome          required*   genome identifier. Required if fastaURL is not specified.
    tracks          optional    array of track descriptors to be displayed initially 
    locus           optional    initial genome location


Tracks
======

Tracks can be added during initialization, as described above, or with the browser loadTrack function.  The track is 
described with a json-style object of properties.   The following example loads a bam track

    igv.browser.loadTrack({
      url: 'http://www.broadinstitute.org/igvdata/1KG/b37/data/HG02450/alignment/HG02450.mapped.ILLUMINA.bwa.ACB.low_coverage.20120522.bam',
      label: 'HG02450'
    }
                   

###General track options applicable ot all types

Tracks are configured with json-style configuration objects.   

    url       required   url to the resource.  Protocol-less urls are recommended if the server supports both http and https (e.g. //www.broadinstitute.org/...)
    indexURL  optional   url to associated index file (bai, idx, or tbi file)
    headURL   optional   url for "HEAD" requests.   Useful for Amazon signed urls, where head and get url can differ
    type      optional   string identifying type of file.  Recognized types include  "bed", "vcf", "bam", and "seg"
    label     optional   user-visible name for the track



Browser Control Functions
---------------

The igv.browser api  (preface commands with igv.browser.)

    loadTrack(config)
    
    search(locusOrGene) 
    
    goto(chr, start, end)
    
    zoomIn();
    
    zoomOut();
