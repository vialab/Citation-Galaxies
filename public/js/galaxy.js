var galaxyGroupBy = 3; //4: journal 3: year 5: paper length, used to group references in the galaxies

var galaxyData = {}; //The dict to hold all the info for the galaxies

var currentURL = "http://localhost:5432/"; //The url to access the backend

//Groups the galaxies' data
function groupGalaxyData(indexToGroupOn, selectionString, selection) {
    var temp = {};

    //Group data on particular piece of data (indexToGroupOn)
    for (var i = 0; i < galaxyData[selectionString][selection].length; i++) {
        if (temp[galaxyData[selectionString][selection][i][indexToGroupOn]] == null) {
            temp[galaxyData[selectionString][selection][i][indexToGroupOn]] = [];
        }
        //Push the current reference information onto the temp array
        temp[galaxyData[selectionString][selection][i][indexToGroupOn]].push(galaxyData[selectionString][selection][i]);
    }
    //Clear the galaxy data array
    galaxyData[selectionString][selection] = [];

    //Group the data
    for (var key in temp) {
        for (var i = 0; i < temp[key].length; i++) {
            galaxyData[selectionString][selection].push(temp[key][i]);
        }
    }
}

//Adds reference(s) to the galaxy
function addDataToGalaxy(selection) {
    if (document.getElementById("pills-galaxies-tab").classList.contains('disabled')) {
        document.getElementById("pills-galaxies-tab").classList.remove("disabled");
    }

    var selectionString = ""; //Build the search query (in a array format) into a string
    for (var i = 0; i < currSearchQuery.length; i++) {
        selectionString += currSearchQuery[i];
        if (i != currSearchQuery.length - 1) {
            selectionString += " ";
        }
    }

    //Check if there is a galaxy already
    if (galaxyData[selectionString] == null) {
        galaxyData[selectionString] = [[], [], []];
    } else {
        var element = document.getElementById("galaxyColumn-" + selectionString);
        element.parentNode.removeChild(element);
    }

    //Check if the data is already in the galaxy
    for (var i = 0; i < referencesSelected.length; i++) {
        var found = false;
        for (var j = 0; j < galaxyData[selectionString][selection].length; j++) {
            if (galaxyData[selectionString][selection][j][0] == referencesSelected[i][0] &&
                galaxyData[selectionString][selection][j][1] == referencesSelected[i][1]) {
                found = true;
                break;
            }
        }
        if (found == false) {
            galaxyData[selectionString][selection].push(referencesSelected[i]); //TBD - perhaps make it such that you cant select same references in positive/negative/neutral
        }
    }

    //Sort the galaxies' data
    for (var i = 0; i < galaxyData[selectionString][selection].length; i++) {
        for (var j = i; j < galaxyData[selectionString][selection].length; j++) {
            if (galaxyData[selectionString][selection][i][0] < galaxyData[selectionString][selection][j][0]) {
                var temp = galaxyData[selectionString][selection][i];
                galaxyData[selectionString][selection][i] = galaxyData[selectionString][selection][j];
                galaxyData[selectionString][selection][j] = temp;
                //break;
            }
        }
    }

    //Group the data by the current global grouping variable, the search query, and the reference to be selected
    groupGalaxyData(galaxyGroupBy, selectionString, selection);

    //Draw the galaxy
    drawGalaxy(selectionString);

    //Remove the selected references from the paper screen
    referencesSelected = [];
}

function switchToGalaxies() {
    //Allows the user access to the papers page once they've selected an item
    if (document.getElementById("pills-papers-tab").classList.contains('disabled')) {
        document.getElementById("pills-papers-tab").classList.remove("disabled");
    }
    d3.select("#groupByButton").style("display", null); //Unhide sort button for papers
    $('#pills-galaxies-tab').tab('show');
}

function exportJSON() {
    //Create a fake element to force the download of the JSON
    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(galaxyData));
    hiddenElement.target = '_blank';
    hiddenElement.download = 'data.json';
    hiddenElement.click();
}

function removeGalaxyReference(content) {
    var found = false; //Used if the reference to delete was found
    var keyUsed = ""; //Used to redraw the galaxy once data has been deleted

    //Find the reference and the key it was under
    for (var key in galaxyData) {
        for (var i = 0; i < galaxyData[key].length && found != true; i++) { //Get the 3 different outcomes (pos, neg, neut)
            for (var j = 0; j < galaxyData[key][i].length; j++) { //Loop through the outcomes' data
                if (galaxyData[key][i][j][1] == content) {
                    found = true;
                    galaxyData[key][i].splice(j, 1);
                    break;
                }
            }
        }
        if (found == true) {
            keyUsed = key;
            break;
        }
    }

    //Redraw the galaxy that had data removed from it
    if (keyUsed != "") {
        $('[data-toggle=popover]').popover('hide');
        var element = document.getElementById("galaxyColumn-" + keyUsed);
        element.parentNode.removeChild(element);

        var max = 0;
        for (var i = 0; i < galaxyData[keyUsed].length; i++) {
            if (galaxyData[keyUsed][i].length > max) {
                max = galaxyData[keyUsed][i].length;
            }
        }
        if (max != 0) {
            drawGalaxy(keyUsed);
        } else {
            delete galaxyData[keyUsed];
        }
    }
}

function drawGalaxyCircle(svgContainer, angle, circleSize, color, radius, htmlContent) {
    //Get height of the container
    var height = svgContainer.attr('height');
    var width = svgContainer.attr('width');

    //Define locations
    var cx = circleFormulaX(angle, height, width, radius);
    var cy = circleFormulaY(angle, height, width, radius);

    //Define the popover to display the reference information
    var popover = d3.select("#popover_galaxy_text");
    popover.html("");
    popover.html(htmlContent);

    //Draw the circle and set actions
    var circle = svgContainer.append("circle").attr("cx", cx).attr("cy", cy).attr("r", circleSize).style("fill", color).style("stroke", "black").style("stroke-width", "1").style('position', 'absolute').attr("filter", "url(#dropShadowGalaxy)").attr("data-toggle", "popover").attr("data-content", $('#popover_content_galaxy_wrapper').html());
    $(circle.node()).popover({ html: true, container: 'body' });
    $(circle.node()).on('click', function (e) { //Allows only one popup at a time - if a popup other than the one clicked is active, it is hidden
        $('[data-toggle=popover]').not(this).popover('hide');
    });
}

function drawGalaxyLine(svgContainer, angleOld, angleNew, strokeWidth, formulaRadiusOld, formulaRadiusNew) {

    //Get the height of the container - used in offseting the locations to be in the container
    var height = svgContainer.attr('height');
    var width = svgContainer.attr('width');

    //Get the positions
    var xOld = circleFormulaX(angleOld, height, width, formulaRadiusOld);
    var xNew = circleFormulaX(angleNew, height, width, formulaRadiusNew);
    var yOld = circleFormulaY(angleOld, height, width, formulaRadiusOld);
    var yNew = circleFormulaY(angleNew, height, width, formulaRadiusNew);

    //Draw the line
    svgContainer.append("line").attr("x1", xOld).attr("y1", yOld).attr("x2", xNew).attr("y2", yNew).style("stroke", "grey").style("stroke-width", strokeWidth).style('position', 'absolute');
}

//Formulas used to convert radians to locations
function circleFormulaX(angle, height, width, radius) {
    return ((radius * Math.cos(angle)) + (width / 2));
}
function circleFormulaY(angle, height, width, radius) {
    return ((radius * Math.sin(angle)) + (height / 2));
}

function drawGalaxy(ngram) {
    //Get the maximum size of references for the galaxy, then define the container size using it
    var max = 0;
    for (var i = 0; i < galaxyData[ngram].length; i++) {
        if (galaxyData[ngram][i].length > max) {
            max = galaxyData[ngram][i].length;
        }
    }
    max = Math.ceil(max / 5); //Divide by 5 to get the amount of rows
    var width = (max * 50) + 150;
    var height = (max * 50) + 150;

    //Create space to place galaxy
    var galaxy = galaxyRow.append("div").attr("class", "col-md-* nopadding").attr("id", "galaxyColumn-" + ngram);
    var nodes = galaxy.append("g").style('position', 'relative');
    var svgContainer = nodes.append("svg").attr("height", width).attr('width', height);
    var dropShadow = svgContainer.append("defs").append("filter")
        .attr("id", "dropShadowGalaxy")
        .attr("height", "130%");
    dropShadow.append("feOffset")
        .attr("result", "offOut")
        .attr("in", "SourceGraphic")
        .attr("dx", 0)
        .attr("dy", 1);
    dropShadow.append("feColorMatrix")
        .attr("result", "matrixOut")
        .attr("in", "offOut")
        .attr("type", "matrix")
        .attr("values", "0.2 0 0 0 0 0 0.2 0 0 0 0 0 0.2 0 0 0 0 0 1 0");
    dropShadow.append("feGaussianBlur")
        .attr("result", "blurOut")
        .attr("in", "matrixOut")
        .attr("stdDeviation", 1.25);
    dropShadow.append("feBlend")
        .attr("in", "SourceGraphic")
        .attr("in2", "blurOut")
        .attr("mode", "normal");


    //Get the ngram and place it in the center of the circle
    var lemma = ngram;
    var sizex = lemma.length * 7.645;
    var sizey = 24;
    var text = nodes.append("text")
        .style('position', 'absolute') //1 character is 7.645 pixels
        .style("left", ((width / 2) - (sizex / 2)).toString() + "px")
        .style("top", (-(height / 2) + (sizey / 2)).toString() + "px")
        .style('fill', 'red')
        .text(lemma);

    var locationsPositiveBase = [0, 0.47, 0.87, 1.27, 1.67];
    var locationsNegativeBase = [2.07, 2.47, 2.87, 3.27, 3.67];
    var locationsNeutralBase = [4.07, 4.55, 5, 5.45, 5.9];
    var locations = [[locationsPositiveBase, "#214517"], [locationsNegativeBase, "#c62f2d"], [locationsNeutralBase, "#e5ac9d"]];

    //Loop through all data for the ngram
    for (var i = 0; i < galaxyData[ngram].length; i++) {
        var circleMultiplier = 1;
        var circleSize = (25 * (circleMultiplier) + 60); //Determines the locations of the mini circles
        var index = 0; // Used to index the locations at proper values
        var addOrSubtract = false; //False means add, true means subtract the index

        var currentItem = 0; //Used group similar references together
        for (var j = 0; j < galaxyData[ngram][i].length; j++) {
            currentItem = galaxyData[ngram][i][j][0]; //Get the current item, eg. paper id

            var htmlContent = "<h2>" + galaxyData[ngram][i][j][2] + " (" + galaxyData[ngram][i][j][3] + ") (" + galaxyData[ngram][i][j][0] + ") (" + galaxyData[ngram][i][j][4] + ")" + "</h2><div id='referenceData'>" + galaxyData[ngram][i][j][1] + "</div>";
            drawGalaxyCircle(svgContainer, locations[i][0][index], 10, locations[i][1], circleSize, htmlContent); //Draw the paper at the current index

            if (j != 0 && currentItem == galaxyData[ngram][i][j - 1][0]) { //If the circle drawn is not the first circle and it has the same item as the last circle, draw a line
                if ((index <= 0 && addOrSubtract == false) || (index >= locations[i][0].length - 1 && addOrSubtract == true)) { //If on the edges
                    drawGalaxyLine(svgContainer, locations[i][0][index], locations[i][0][index], 1, (25 * (circleMultiplier - 1) + 60), circleSize);
                } else {
                    if (addOrSubtract == true) { //An if to check whether going up or down the circle
                        drawGalaxyLine(svgContainer, locations[i][0][index + 1], locations[i][0][index], 2, circleSize, circleSize);
                    } else {
                        drawGalaxyLine(svgContainer, locations[i][0][index - 1], locations[i][0][index], 2, circleSize, circleSize);
                    }
                }
            }

            if (addOrSubtract == false) {
                index += 1;
            } else {
                index -= 1;
            }

            //Check if a new circle needs to be made. If so, change the circle's size and subtract or add
            if (index >= locations[i][0].length || (index <= -1 && j != 0)) {
                circleMultiplier += 1;
                /*if(circleMultiplier > maxCircleMultiplier){
                    maxCircleMultiplier = circleMultiplier;
                }*/
                circleSize = (25 * (circleMultiplier) + 60);

                if (addOrSubtract == true) {
                    addOrSubtract = false;
                    index += 1;
                } else {
                    addOrSubtract = true;
                    index -= 1;
                }
            }

        }

    }

    //Code to hightlight the clicked reference
    /*$('html').on('click', function (e) {
        if ($(e.target).data('toggle') !== 'popover' && $(e.target).parents('.popover').length === 0) {
            var temp = $('[data-toggle=popover]');
            for (var i = 0; i < temp.length; i++) {
                drawBorder(d3.select(temp[i]), true);
            }
        }

    });*/
}
