import igv from "../dist/igv.esm.min.js";
const options = {
    genome: "hg19",
    tracks: [
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
                return "https://www.encodeproject.org/files/ENCFF563PAW/@@download/ENCFF563PAW.bigWig";
            }
        },
        {
            name: "CTCF - promise url",
            type: "wig",
            format: "bigwig",
            url: Promise.resolve("https://www.encodeproject.org/files/ENCFF563PAW/@@download/ENCFF563PAW.bigWig")
        },
        {
            name: "CTCF - function that returns promise url",
            type: "wig",
            format: "bigwig",
            url: function () {
                return Promise.resolve("https://www.encodeproject.org/files/ENCFF563PAW/@@download/ENCFF563PAW.bigWig");
            }
        },
        {
            name: "CTCF - function that returns thenable ",
            type: "wig",
            format: "bigwig",
            url: function () {
                return {
                    then: function (resolve, reject) {
                        resolve("https://www.encodeproject.org/files/ENCFF563PAW/@@download/ENCFF563PAW.bigWig");
                    }
                };
            }
        }
    ]
};
const igvDiv = document.getElementById("igvDiv");
igv.createBrowser(igvDiv, options)
    .then(function (browser) {
    console.log("Created IGV browser");
});
