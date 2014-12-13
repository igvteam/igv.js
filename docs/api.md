Note: This document is written in "markdown".  Please respect the [markdown conventions] (http://daringfireball.net/projects/markdown/) when editig.


Browser Initialization
======================

Client pages interact with IGV through the singleton "igv.browser" object.  The object is created and initialized with the function

    igv.createBrowser(div, options)
    
The first argument is the parent div,  IGV  inserts itself into the dom here. The second argument is an object
defining configuration options, described in more detail below.  

In the following example IGV is initialized with two initial tracks: genomic sequence and gene annotations.  


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
            

###General track options applicable ot all types

Tracks are configured with json-style configuration objects.   All paramters are optional with exception of "url"  

    url       url to the resource.  Protocol-less urls are recommended if the server supports both http and https (e.g. //www.broadinstitute.org/...)
    indexURL  url to associated index file (bai, idx, or tbi file)
    headURL   url for "HEAD" requests.   Useful for Amazon signed urls, where head and get url can differ
    type      string identifying type of file.  Recognized types include  "bed", "vcf", "bam", and "seg"
    label     user-visible name for the track
    color     default color for features.  Can be overriden in certain file formats
    height    initial track height
    order     integer specifying tracks vertical placement relative to other tracks.  Use to pin tracks to top (large negative number) or bottom (large positive number)

###Alignment track (type = "bam")

    visibilityWindow    Window size in bp at which alignments are loaded.  Default value is 30000 (30kb)    

    alignmentRowHeight  height of each alignment row.   Default = 14
    alignmentColor      default color for alignments    Default = rgb(185, 185, 185)"
    negStrandColor      for "color by strand" option.  Default = "rgb(150, 150, 230)"
    posStrandColor      for "color by strand" option.  Default = "rgb(230, 150, 150)"
    deletionColor       color of line connecting blocks from deletion (cigar = "d")
    skippedColor        color of line connection blocks for cigar "n"
    coverageColor       color of coverage track


###Copy number track (type = "seg")

    sampleHeight   Height of individual sample row (default = 2)
    posColorScale  Heat map scale for copy number gain.
    negColorScale  Heat map scale for copy number loss
    
    TODO -- heatmap scale json description   



Browser Control API
=========================

After initialization the browser can be controlled through the object "igv.browser" using the commands described below.

Note:  To load tracks or specify a locus on initial startup use the the startup "options" object, not the commands below.

The igv.browser api  (preface commands with igv.browser.)

    loadTrack(config)
    
    search(locusOrGene) 
    
    zoomIn();
    
    zoomOut();


###loadTracks

The following example loads a bam track

    igv.browser.loadTrack({
      url: 'http://www.broadinstitute.org/igvdata/1KG/b37/data/HG02450/alignment/HG02450.mapped.ILLUMINA.bwa.ACB.low_coverage.20120522.bam',
      label: 'HG02450'
    }
 
###search
       
Search by gene symbol

    igv.browser.search('EGFR')

Go to explicit location

    igv.browser.search('chr10:1000-2000;)

###zoomIn

Zoom in by a factor of 2

    igv.browser.zoomIn();

Zoom out by a factor of 2

    igv.browser.zoomOut();


