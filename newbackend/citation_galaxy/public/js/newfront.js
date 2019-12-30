$(document).ready( (x,y,z) => {
    console.log("newfront ready: ",x,y,z)

});

$(window).on('load', function() {
    console.log("newfront load");
    
    // Load the year range (hooks into old code)
    getYears( _ => {
        
        // Call old loading function
        getFilteredYears("", true, undefined, false, true);
    })

});