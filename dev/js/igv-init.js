import ig from "../../js/igv-create.js";

const options =
    {
        reference: {
            fastaURL: "../local/caeJap1/chrUn.fa",
            indexURL: "../local/caeJap1/chrUn.fa.fai"
        },

        tracks: [
            {
                name: "Genes",
                type: "annotation",
                format: "refgene",
                url: "../local/caeJap1/xenoRefGene.txt.gz",
                indexed: false
            }
        ]
    };


ig.createBrowser(document.getElementById('igvDiv'), options)
    .then(function (browser) {
        return browser;
    })
