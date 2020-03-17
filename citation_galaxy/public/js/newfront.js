$(document).ready( (x,y,z) => {
    console.log("newfront ready: ",x,y,z)

});

$(window).on('load', function() {
    console.log("newfront load");
    
    // Load the year range (hooks into old code)
    getYears( _ => {
        
    //     // Call old loading function
        getFilteredYears("", true, undefined, false, true);
    })



});
const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1)
}
d3.selection.prototype.first = function() {
    return d3.select(
        this.nodes()[0]
    );
};
d3.selection.prototype.last = function() {
    return d3.select(
        this.nodes()[this.size() - 1]
    );
};

function name(params) {
    
}