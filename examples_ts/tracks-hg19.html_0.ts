import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


import igv from "../js/igv";

const options: CreateOpt =
    {
        genome: "hg19",
        locus: "chr1:155,138,124-155,153,715",
        tracks:
            [
                {
                    name: "Phase 3 WGS variants",
                    url: "https://s3.amazonaws.com/1000genomes/release/20130502/ALL.wgs.phase3_shapeit2_mvncall_integrated_v5b.20130502.sites.vcf.gz",
                    indexURL: "https://s3.amazonaws.com/1000genomes/release/20130502/ALL.wgs.phase3_shapeit2_mvncall_integrated_v5b.20130502.sites.vcf.gz.tbi"
                },
                {
                    name: "ENCODE bigwig",
                    url: 'https://www.encodeproject.org/files/ENCFF206QIK/@@download/ENCFF206QIK.bigWig'
                },
                {
                    url: "https://www.encodeproject.org/files/ENCFF001GBH/@@download/ENCFF001GBH.bigBed",
                    color: "rgb(0, 150, 0)",
                    name: "Bigbed with color (green)",
                },
                {
                    url: 'https://www.encodeproject.org/files/ENCFF000ASF/@@download/ENCFF000ASF.bigWig',
                    name: 'Group Autoscale 1 of 3',
                    color: 'rgb(200,0,0)',
                    autoscaleGroup: '1'
                },
                {
                    url: 'https://www.encodeproject.org/files/ENCFF000ASJ/@@download/ENCFF000ASJ.bigWig',
                    name: 'Group Autoscale 2 of 3',
                    color: 'rgb(0,0,150)',
                    autoscaleGroup: '1'
                },
                {
                    url: 'https://www.encodeproject.org/files/ENCFF000ATA/@@download/ENCFF000ATA.bigWig',
                    name: 'Group Autoscale 3 of 3',
                    color: 'rgb(0,150,0)',
                    autoscaleGroup: '1'
                },
                {
                    name: "Merged",
                    height: 50,
                    type: "merged",
                    tracks: [
                        {
                            "type": "wig",
                            "format": "bigwig",
                            "url": "https://www.encodeproject.org/files/ENCFF000ASJ/@@download/ENCFF000ASJ.bigWig",
                            "color": "red"
                        },
                        {
                            "type": "wig",
                            "format": "bigwig",
                            "url": "https://www.encodeproject.org/files/ENCFF351WPV/@@download/ENCFF351WPV.bigWig",
                            "color": "green"
                        }
                    ]
                },
                {
                    url: 'https://s3.amazonaws.com/igv.org.test/data/wgEncodeBroadHistoneGm12878H3k4me3StdSig.wig.tdf',
                    name: 'tdf file',
                    color: 'blue'
                },
                {
                    name: "CTCF - string url",
                    type: "wig",
                    format: "bigwig",
                    url: "https://www.encodeproject.org/files/ENCFF563PAW/@@download/ENCFF563PAW.bigWig"
                },
                {
                    name: "CTCF - function url ",
                    type: "wig",
                    format: "bigwig",
                    url: function () {
                        return "https://www.encodeproject.org/files/ENCFF563PAW/@@download/ENCFF563PAW.bigWig"
                    }
                },
                {
                    name: "CTCF - promise url",
                    type: "wig",
                    format: "bigwig",
                    url: Promise.resolve("https://www.encodeproject.org/files/ENCFF563PAW/@@download/ENCFF563PAW.bigWig")
                },
                {
                    name: "CTCF - function that returns promise ",
                    type: "wig",
                    format: "bigwig",
                    url: function () {
                        return Promise.resolve("https://www.encodeproject.org/files/ENCFF563PAW/@@download/ENCFF563PAW.bigWig")
                    }
                },
                {
                    name: "CTCF - function that returns thenable ",
                    type: "wig",
                    format: "bigwig",
                    url: function () {
                        return {
                            then: function (resolve, reject) {
                                resolve("https://www.encodeproject.org/files/ENCFF563PAW/@@download/ENCFF563PAW.bigWig")
                            }
                        }
                    }
                },
                {
                    name: "Copy number -- embedded (json) features",
                    type: "seg",
                    displayMode: "EXPANDED",
                    log: true,
                    features: [
                        {
                            "chr": "chr1",
                            "start": 155141825,
                            "end": 155150000,
                            "value": 0.8239,
                            "sample": "Sample 1"
                        },
                        {
                            "chr": "chr1",
                            "start": 155149967,
                            "end": 155150988,
                            "value": -0.8391,
                            "sample": "Sample 2"
                        }
                    ]
                }
            ]

    };

var igvDiv = (document.getElementById("igvDiv") as HTMLElement);

igv.createBrowser(igvDiv, options)
    .then(function (browser) {
        console.log("Created IGV browser");
    })
