// https://sashamaps.net/docs/resources/20-colors/
const distinctColorsPaletteSrcStrings =
    [
            'rgb(230, 25, 75)',
            'rgb(60, 180, 75)',
            'rgb(255, 225, 25)',
            'rgb(0, 130, 200)',
            'rgb(245, 130, 48)',
            'rgb(145, 30, 180)',
            'rgb(70, 240, 240)',
            'rgb(240, 50, 230)',
            'rgb(210, 245, 60)',
            'rgb(250, 190, 212)',
            'rgb(0, 128, 128)',
            'rgb(220, 190, 255)',
            'rgb(170, 255, 195)',
            'rgb(128, 128, 0)',
            'rgb(255, 215, 180)',
            'rgb(128, 128, 128)',
    ]

const _18_DistinctColorsViaChatGPT4 = [
    "rgb(255, 0, 0)",     // Red
    "rgb(0, 255, 0)",     // Green
    "rgb(0, 0, 255)",     // Blue
    "rgb(255, 0, 255)",   // Magenta
    "rgb(0, 255, 255)",   // Cyan
    "rgb(128, 0, 128)",   // Purple
    "rgb(255, 165, 0)",   // Orange
    "rgb(255, 105, 180)", // Hot Pink
    "rgb(255, 127, 80)",  // Coral
    "rgb(220, 20, 60)",   // Crimson
    "rgb(255, 99, 71)",   // Tomato
    "rgb(173, 216, 230)", // Light Blue
    "rgb(144, 238, 144)", // Light Green
    "rgb(224, 255, 255)", // Light Cyan
    "rgb(250, 250, 210)", // Light Goldenrod
    "rgb(152, 251, 152)", // Pale Green
    "rgb(70, 130, 180)",  // Steel Blue
    "rgb(102, 205, 170)"  // Medium Aquamarine
];

const distinctColorsPalette = _18_DistinctColorsViaChatGPT4.map(str => {
        const [ _0, g, _1] = str.split(',')
        const [ _2, r ] = _0.split('(')
        const [ b, _3 ] = _1.split(')')
        return [ r, g, b ]
})

export { distinctColorsPalette }
