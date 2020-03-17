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

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1)
}

function name(params) {
    
}