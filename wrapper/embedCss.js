(function () {

    var css =  '_CSS_';

    var style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.innerHTML = css;

    var headChildren = document.head.childNodes;
    var beforeChild = null;

    for (var i = headChildren.length - 1; i > -1; i--) {
        var child = headChildren[i];
        var tagName = (child.tagName || '').toUpperCase();
        if (['STYLE', 'LINK'].indexOf(tagName) > -1) {
            beforeChild = child;
        }
    }
    // document.head.insertBefore(style, beforeChild);

    beforeChild = headChildren[ headChildren.length - 1 ];
    document.head.insertBefore(style, beforeChild);

})();
