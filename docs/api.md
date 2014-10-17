
Browser Initialization
-----------------------

Client pages interact with IGV through the igv.browser object.  The object is created and initialized with the function

    igv.createBrowser(div, options)
    
The first argument is the parent div,  IGV  inserts itself into the dom here. The second argument is an object
defining configuration options, described in more detail below.   

In the following example IGV is initialized with
a two initial tracks, genomic sequence and gene annotations.



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
fastaURL    required    url to an indexed fasta file
cytobandURL required    url to a cytoband file in UCSC format  (<link to format description>
tracks      optional    array of track descriptors to be displayed initially
      
Tracks
------

Tracks can be added during initialization, as described above, or with the browser loadTrack function.  The track is 
described with a json-style object of properties.   The following example loads a bam track

    igv.browser.loadTrack({
      url: 'http://www.broadinstitute.org/igvdata/1KG/b37/data/HG02450/alignment/HG02450.mapped.ILLUMINA.bwa.ACB.low_coverage.20120522.bam',
      label: 'HG02450'
    }
                   
 
 
 

Browser Control
---------------


loadTrack(trackDescriptor)

The igv.browser api

search(locusOrGene) 

goto(chr, start, end)

zoomIn();

zoomOut();

  