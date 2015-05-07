/**
 * Created by turner on 5/6/15.
 */

function createTracksDropdown() {

    var dropdown,
        listActionItems;

    dropdown = $(".dropdown");
    listActionItems = dropdown.find("li").find("a");

    $(listActionItems[ 0 ]).click(function(){

        igv.browser.loadTrack({
            url: 'http://www.broadinstitute.org/igvdata/1KG/b37/data/NA06984/alignment/NA06984.mapped.ILLUMINA.bwa.CEU.low_coverage.20120522.bam',
            label: 'NA06984'});

    });

    $(listActionItems[ 1 ]).click(function(){

        igv.browser.loadTrack({
            sourceType: 'ga4gh',
            type: 'bam',
            url: 'https://www.googleapis.com/genomics/v1beta2',
            readGroupSetIds: 'CMvnhpKTFhCjz9_25e_lCw',
            label: 'Ga4gh Reads'});

    });

    $(listActionItems[ 2 ]).click(function(){

        igv.browser.loadTrack({
            sourceType: 'ga4gh',
            type: 'vcf',
            url: 'https://www.googleapis.com/genomics/v1beta2',
            variantSetId: '10473108253681171589',
            visibilityWindow: 100000,
            label: 'Ga4gh Variants'});

    });

    $(listActionItems[ 3 ]).click(function(){

        igv.browser.loadTrack({
            url: '//www.broadinstitute.org/igvdata/test/igv-web/segmented_data_080520.seg.gz',
            label: 'GBM Copy # (TCGA Broad GDAC)'});

    });

    $(listActionItems[ 4 ]).click(function(){

        igv.browser.loadTrack({
            type: 'eqtl',
            url: '//www.gtexportal.org/igv/assets/eqtl/Skin_Sun_Exposed_Lower_leg.portal.eqtl.bin',
            label: 'Skin Sun Exposed Lower leg'});

    });

    $(listActionItems[ 5 ]).click(function(){

        igv.browser.loadTrack( {
            url: '//www.broadinstitute.org/igvdata/t2d/recomb_decode.bedgraph',
            label: 'Recombination rate'});

    });

    $(listActionItems[ 6 ]).click(function(){

        igv.browser.loadTrack(
            {
                type: 'vcf',
                url: '//www.broadinstitute.org/igvdata/test/igv-web/TSVC_variants_IonXpress_078.vcf.gz',
                label: 'TSVC Variants 078'
            });

    });

    $(listActionItems[ 7 ]).click(function(){

        igv.browser.loadTrack(
            {
                type: 'bed',
                url: '//www.broadinstitute.org/igvdata/annotations/hg19/dbSnp/snp137.hg19.bed.gz',
                visibilityWindow: 200000,
                label: 'dbSNP 137'
            });

    });

    //dropdown.on('shown.bs.dropdown', function (e) {
    //
    //    var listItems = $(this).find("li");
    //
    //    console.log("ul.dropdown-menu - shown.bs.dropdown");
    //
    //});
    //
    //dropdown.on('hidden.bs.dropdown', function (e) {
    //
    //    console.log("ul.dropdown-menu - hidden.bs.dropdown");
    //
    //});

}