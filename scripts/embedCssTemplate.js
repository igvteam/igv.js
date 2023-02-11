function embedCSS() {

    var css = '_CSS_'

    var style = document.createElement('style')
    style.setAttribute('type', 'text/css')
    style.innerHTML = css

    document.head.append(style)

}

export default embedCSS
