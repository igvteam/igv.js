
Browser Initialization
-----------------------

Client pages interact with IGV through the igv.browser object.  The object is created and initialized with the function

    igv.createBrowser(div, options)
    
The first argument is the parent div,  IGV  inserts itself into the dom here. The second argument is an object
defining configuration options, described in more detail below.   

In the following example IGV is initialized with two initial tracks, genomic sequence and gene annotations.



        options = {
            showKaryo: true,
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



showKaryo   optional    true|false  If true the whole-genome karyotype view is displayed.  
genome      *           genome identifier.  Currently only "hg19" is recognized. 
fastaURL    *           url to an indexed fasta file.  Required if genome id is not specified.
cytobandURL optional    url to a cytoband file in UCSC format  (<link to format description>
locus       optional
tracks      optional    array of track descriptors to be displayed initially
      
Tracks
------

Tracks can be added during initialization, as described above, or with the browser loadTrack function.  The track is 
described with a json-style object of properties.   The following example loads a bam track

    igv.browser.loadTrack({
      url: 'http://www.broadinstitute.org/igvdata/1KG/b37/data/HG02450/alignment/HG02450.mapped.ILLUMINA.bwa.ACB.low_coverage.20120522.bam',
      label: 'HG02450'
    }
                   

General track options applicable ot all types

type      optional   string identifying type of file.  Recognized types include  "bed", "vcf", "bam", and "seg"
url       required   url to the resource.  Protocol-less urls are recommended if the server supports both http and https (e.g. //www.broadinstitute.org/...)
indexUrl  optional   url to associated index file (bai, idx, or tbi file)
headUrl   optional   url for "HEAD" requests.   Useful for Amazon signed urls, where head and get url can differ
label     optional   user-visible name for the track
 

Browser Control Functions
---------------

The igv.browser api  (preface commands with igv.browser.)

loadTrack(config)

search(locusOrGene) 

goto(chr, start, end)

zoomIn();

zoomOut();

  