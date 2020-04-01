//Used to update the slider label to report the current value
var sentenceRangeAbove = 0;
var sentenceRangeBelow = 0;

//Draws a square on the above row with a label and sizes
//Can use d3.interpolateViridis for viridis
//I quite like interpolateRdBu
var colors = d3.interpolateBlues;
var seperations;
var seperationLabels;

var miniSquares = []; //All the mini, heatmapped, square's ids (hitbox)
var miniSquaresObjects = []; //All the mini, heatmapped, sqaure's (box)
var miniSquareText = []; //All the mini, heatmapped, sqaure's text

var selections = []; //Current user selections
var selectionObjects = []; //Current objects highlighted

var currIncrement = 10; //The current homescreen increment
var currBoxHeight = 64;
var currBoxPadding = 10;

var lineColors = []; //The colors of the lines on the left
var paperGlyphLines = []; //The lines on the paper to the left

var paperRequests = []; //The collection of server requests

var maxLabels = 2; //The max amount of labels per box
var currentLabel = 0; //The current label choice to display on the squares

var currentNorm = 0; //The current normalization, 0 normalizes between years and 1 normalizes within years

var possibleSeperations = [1, 10, 25, 50]; //The possible seperations allowed

var inTextSelection = []; //The selection inside the paper
var currentPaperIndicator; //The paper's cirlce indicator (used to show if the paper hasnt been completed or if it has been completed)
var currentPaperSelected;

var buttonsSelected = {}; //Used to count the current amount of buttons selected (used to determine if to show the paper indicator)

var boundariesByPaper = {}; //Used to hold the sentence boundaries for each paper
var indexToSortPapersOn = -1; //The value to sort the papers with

var referencesSelected = []; //The current boundary selections for the current paper
var galaxyGroupBy = 3; //4: journal 3: year 5: paper length, used to group references in the galaxies

var paperText = {}; //Holds the raw paper text
var paperData = {}; //Holds the paper data - mainly where words, references and sentences are and their locations
var paperRow; //The row that holds all the papers

var filteredYearCounts = {}; //Holds amount of X in each year
var filteredYearPercents = {}; //Holds the percents calculated from the results / total for each year - used in the colors

var svgContainers = []; //Used to hold all the containers used

var years = []; //Used to hold all the years from the server

var yearResults = {}; //Place to store the results from the year
var yearResultsRequests = []; //Place to store the requests made to the server

var galaxyData = {}; //The dict to hold all the info for the galaxies

var currentURL = "http://localhost:5434/"; //The url to access the backend

//Used to change the increment on the main screen
function seperationChange(increment) {
    //Generate new seperation screen
    for (var i = 0; i < 100; i += increment) {
        seperations.push(i.toString() + "%-" + (i + increment).toString() + "%");
    }

    //Changes the active item on the dropdown
    for (var i = 1; i < possibleSeperations.length + 1; i++) {
        if (increment != possibleSeperations[i - 1]) {
            d3.select("#changeIncrementItem" + i.toString()).classed('active', false);
        } else {
            d3.select("#changeIncrementItem" + i.toString()).classed('active', true);
        }
    }


    //Update the current increment
    currIncrement = increment;
}

//Change the normalization, update the colors and display them
//Could use some optimization however
function normalizationChange(value) {
    if (value != currentNorm) {
        d3.select("#normByItem" + currentNorm.toString()).classed('active', false);
        currentNorm = value;
        for (var i = 0; i < years.length; i++) {
            filterYearResults(currIncrement, years[i]['articleyear']);
        }
        changeSquaresColors();
        d3.select("#normByItem" + currentNorm.toString()).classed('active', true);
    }
}

//Remove all database requests
function clearRequests(yearRequests, paperRequest) {
    //If a paper request was made, clear all the previous paper requests
    if (paperRequest == true) {
        for (var i = 0; i < paperRequests.length; i++) {
            paperRequests[i].abort();
        }
        paperRequests = [];
    }
    // If a year request was made, clear all the year requests
    if (yearRequests == true) {
        for (var i = 0; i < yearResultsRequests.length; i++) {
            yearResultsRequests[i].abort();
        }
        yearRequests = [];
    }
}

//Clear all data
function clearAll() {
    seperations = [];
    seperationLabels = [];
    miniSquares = [];
    filteredYearCounts = [];
    filteredYearPercents = [];
    //selections = [];
    selectionObjects = [];
    miniSquaresObjects = [];
    lineColors = [];
    paperGlyphLines = [];
    clearRequests(true, true);
}

//Used to shorten integers when they go past 1000, 1000 would go to 1.0k and so on
function shortenVal(value) {
    return value > 999 ? (value / 1000).toFixed(1) + 'k' : value //Not my function
}

//Updates the range text dynamically
function updateTextInput(field, before, after, articleid, sendToDefault) {
    //Get the values to update
    console.log(field);
    before = parseInt(before);
    if (before != 0) {
        before = before * -1;
    }
    after = parseInt(after);

    //Either change the global boundary, or change it on a per paper basis
    if (sendToDefault == 1) {
        sentenceRangeAbove = before;
        sentenceRangeBelow = after;
    } else if (sendToDefault == 0) {
        boundariesByPaper[articleid] = [before, after];
    }
    field.innerHTML = "[ " + before.toString() + " <- Citation -> " + after.toString() + " ]";
}

//Used to change the labels on the square boxes on the main screen (can display how many results or how many papers)
function changeLabel(choice) {
    //Based on a int in the label's id, make one label white (or grey) and make the other transparent

    //Change the old label to be invisible, show the new one
    currentLabel = choice;

    //Clear the paper glyph and recalculate the lines
    $(svgContainers[0].node()).empty();
    paperGlyphLines = [];
    lineColors = [];
    drawFirstColumn(110, (100 / currIncrement) * 16, 80, svgContainers[0], 100 / currIncrement);
    for (var i = 0; i < years.length; i++) {
        if (filteredYearCounts[years[i]['articleyear']] != undefined) {
            $(svgContainers[i + 1].node()).empty();
            drawColumn(years[i]['articleyear'], 80, 64, currBoxHeight, svgContainers[i + 1], filteredYearPercents[years[i]['articleyear']][currentLabel], filteredYearCounts[years[i]['articleyear']][currentLabel]);
        }
    }

    //Change the active label
    for (var i = 0; i < maxLabels; i++) {
        if (i != currentLabel) {
            d3.select("#changeLabelItem" + i.toString()).classed('active', false);
        } else {
            d3.select("#changeLabelItem" + i.toString()).classed('active', true);
        }
    }
}

//Used to highlight the references selected
function selectPaperViewBoundary(object) {
    //Select the reference if it hasnt been already, and display the active article icon
    if (!d3.select(object).classed('border-primary')) {
        d3.select(object).classed('border-primary', true);
        inTextSelection.push(object);
    } else {
        d3.select(object).classed('border-primary', false);
        inTextSelection.splice(inTextSelection.indexOf(object), 1);
    }

    //Add a red circle to a paper that has been editied
    currentPaperIndicator.attr("display", null);
    currentPaperIndicator.style("fill", "red");
}

//Add the refernce to the current list of references selected
function updateReferencesSelected(object) {
    var found = false;
    //If the reference selected is already in the array do not add another copy
    for (var i = 0; i < referencesSelected.length; i++) {
        if (referencesSelected[i][0] == object[0] && referencesSelected[i][1] == object[1]) {
            referencesSelected.splice(i, 1);
            found = true;
            break;
        }
    }
    if (found == false) {
        referencesSelected.push(object);
    }
}

//Changes the grouping the paper view
function changeGroup(newGroup) {
    galaxyGroupBy = newGroup; //Change the current group
    $('[data-toggle=popover]').popover('hide'); //Hide all popups active

    //Change the active button
    switch (newGroup) {
        case (3):
            d3.select("#groupByButton1").classed('active', true);
            d3.select("#groupByButton2").classed('active', false);
            d3.select("#groupByButton3").classed('active', false);
            break;
        case (4):
            d3.select("#groupByButton1").classed('active', false);
            d3.select("#groupByButton2").classed('active', true);
            d3.select("#groupByButton3").classed('active', false);
            break;
        case (5):
            d3.select("#groupByButton1").classed('active', false);
            d3.select("#groupByButton2").classed('active', false);
            d3.select("#groupByButton3").classed('active', true);
            break;

    }

    //Call the grouping function, remove all old galaxies and draw new ones
    var keys = Object.keys(galaxyData);
    for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var tmp = galaxyData[key].length;
        for (var i = 0; i < tmp; i++) {
            groupGalaxyData(galaxyGroupBy, key, i);
        }

        var element = document.getElementById("galaxyColumn-" + key);
        element.parentNode.removeChild(element);
        //$("#galaxyColumn-" + key).remove();
        drawGalaxy(key);
    }
}

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

//Changes the paper boundary and requeries the database
function changePaperTextBoundary(articleid, year) {
    //Hide the popover and remove the glpyh
    var currPaper = currentPaperSelected;
    changingPaper = true;
    $('[data-toggle="popover"]').popover('hide');
    currPaper.selectAll("*").remove();


    //Remove old results from the year screen's data
    var indexToInsert = -1;
    for (var i = 0; i < yearResults[year].length; i++) {
        if (yearResults[year][i][0]['articleid'] == articleid) {
            if (indexToInsert == -1) {
                indexToInsert = i;
            }
            yearResults[year].splice(i, 1);
        }
    }

    //Get new data from the server for the one person
    paperRequests.push($.ajax({
        type: 'POST',
        url: currentURL + "queryCountsPaper",
        data: JSON.stringify({ 'query': currSearchQuery, 'year': year, 'rangeLeft': boundariesByPaper[articleid][0], 'rangeRight': boundariesByPaper[articleid][1], 'paperid': articleid }),
        success: function (data) {
            //Filter data for ngram - similar to how the filtering is done on the main screen
            var tmpResults = [];
            var loopOffset = currSearchQuery.length;
            if (currSearchQuery.length == 1) {
                loopOffset = 0;
            }


            // Offset the loop to catch ngrams
            for (var i = 0; i < data.length - loopOffset; i++) {
                var valid = false; // Used to determine whether to add the result
                var temp = [];

                if (currSearchQuery.length == 1) {
                    valid = true;
                    temp.push(data[i]);
                } else {
                    for (var j = 0; j < currSearchQuery.length; j++) {
                        if (data[i + j]['lemma'] == currSearchQuery[j]
                            && data[i + j]['wordsentence'] == data[i + j + 1]['wordsentence']
                            && data[i + j]['citationStart'] == data[i + j + 1]['citationStart']) {
                            valid = true;
                            temp.push(data[i + j]);
                        } else {
                            valid = false;
                            break;
                        }
                    }
                }

                if (valid == true) {
                    // Add the result to the new list
                    tmpResults.push(temp);
                    yearResults[year].splice(indexToInsert, 0, temp);
                    indexToInsert += 1;
                }
            }


            //Prep data for single paper to be drawn, similar to drawPapers()
            data = tmpResults;
            paperData[articleid] = [];
            for (var i = 0; i < selections.length; i++) {
                var selectionSplit = selections[i].split(":");
                var selectionYear = selectionSplit[0].substring(0, selectionSplit[0].length);

                selectionSplit = selectionSplit[1].trim().split("-");
                var leftBoundary = selectionSplit[0].substring(0, selectionSplit[0].indexOf("%"));
                var rightBoundary = selectionSplit[1].substring(0, selectionSplit[1].indexOf("%"));

                if (selectionYear == year) {
                    for (var j = 0; j < data.length; j++) {
                        if (data[j][0]['percent'] * 100 >= leftBoundary && data[j][0]['percent'] * 100 <= rightBoundary) {

                            if (paperData[data[j][0]['articleid']] == undefined) {
                                paperData[data[j][0]['articleid']] = [];
                            }

                            var startSentence = data[j][0]['citationsentence'] - boundariesByPaper[articleid][0]; //Fix - stop from going to 0 or max sentence num for paper

                            if ((typeof boundariesByPaper[articleid][1]) == "string") {
                                boundariesByPaper[articleid][1] = parseInt(rightBoundary);
                            }
                            var endSentence = data[j][0]['citationsentence'] + boundariesByPaper[articleid][1];

                            paperData[data[j][0]['articleid']].push([]);
                            for (var k = 0; k < data[j].length; k++) {
                                paperData[data[j][0]['articleid']][paperData[data[j][0]['articleid']].length - 1].push(
                                    [data[j][k]['percent'],
                                    data[j][k]['wordstart'],
                                    data[j][k]['wordend'],
                                    data[j][k]['citationstart'],
                                    data[j][k]['citationend'],
                                    data[j][k]['citationarticletitle'],
                                    data[j][k]['citationauthors'],
                                    data[j][k]['citationyear'],
                                        startSentence,
                                        endSentence]);
                            }
                        }
                    }
                }

            }

            var neededBoundaries = [];
            for (var i = 0; i < paperData[articleid].length; i++) {
                var startNeededBoundary = paperData[articleid][i][0][paperData[articleid][i][0].length - 2];
                var endNeededBoundary = paperData[articleid][i][0][paperData[articleid][i][0].length - 1];
                if (!neededBoundaries.includes([startNeededBoundary, endNeededBoundary])) { //Fix - still allows copies in
                    neededBoundaries.push([startNeededBoundary, endNeededBoundary]);
                }
            }
            getPaperBoundary(articleid, neededBoundaries, currPaper, true);
            changingPaper = false;
        }
    }));


}

//Gets the paper text for a paper if its needed - then call getPaperBoundary() to set the boundaries for the papers (start and end location)
function prepPaperText(articleid, neededBoundaries, container, display) {
    paperRequests.push($.ajax({
        type: 'POST',
        url: currentURL + "paperText",
        data: JSON.stringify({ 'articleid': articleid }),
        success: function (data) {
            //console.log(paperText);
            paperText[articleid] = data;
            getPaperBoundary(articleid, neededBoundaries, container, display);
        },
        async: true,
        timeout: 600000
    }));
}

//Gets the location of the beginning and the last sentence for the reference, then draws the paper
function getPaperBoundary(articleid, neededBoundaries, container, display) {
    paperRequests.push($.ajax({
        type: 'POST',
        url: currentURL + "sectionBoundary",
        data: JSON.stringify({ 'articleid': articleid, 'neededBoundaries': neededBoundaries }),
        success: function (data) {
            //Matches the sentencenum to the location
            for (var i = 0; i < paperData[articleid].length; i++) {
                for (var k = 0; k < paperData[articleid][i].length; k++) {
                    for (var j = 0; j < data.length; j++) {
                        if (data[j]['sentencenum'] == paperData[articleid][i][k][paperData[articleid][i][k].length - 2]) {
                            paperData[articleid][i][k][paperData[articleid][i][k].length - 2] = [data[j]['startlocationpaper'], data[j]['endlocationpaper']];
                        }
                        if (data[j]['sentencenum'] == paperData[articleid][i][k][paperData[articleid][i][k].length - 1]) {
                            paperData[articleid][i][k][paperData[articleid][i][k].length - 1] = [data[j]['startlocationpaper'], data[j]['endlocationpaper']];
                        }

                    }
                }
            }

            //Calculate the colors for each line in the glyph
            var paperDist = []; //Used for the line color on the paper
            var paperColor = new Array(10); //Array to hold each color for each line
            for (var i = 0; i < 10; i++) {
                paperDist.push(false);
                paperColor[i] = 0;
            }

            //Find where in the paper the lines should appear, and increment their occurance
            for (var j = 0; j < paperData[articleid].length; j++) {
                for (var i = 1; i < 11; i++) {
                    if (paperData[articleid][j][0][0] <= (i / 10)) {
                        if (paperDist[i - 1] == false) {
                            paperDist[i - 1] = true;
                        }
                        paperColor[i - 1] += 1;
                        break;
                    }

                }
            }

            //Divide the color by 10 to get percents
            for (var i = 0; i < paperColor.length; i++) {
                //If the value is above 10 references per line just set to 10 as max (so that it will divide to 1 and will be set as the dark color)
                if (paperColor[i] > 10) {
                    paperColor[i] = 10;
                }
                paperColor[i] = paperColor[i] / 10;
            }
            drawPaper(110, 160, paperDist, paperColor, container, articleid, display);
        },
        async: true,
        timeout: 600000
    }));
}

//Changes the sorting used by the paper view
function changePaperSort(indexToSortOn) {
    var sortItems = ["#sortByJournal", "#sortByRef", "#sortByYear"];

    //Change the buttons active
    switch (indexToSortOn) {
        case (-1):
            d3.select(sortItems[1]).classed('active', true);
            d3.select(sortItems[0]).classed('active', false);
            d3.select(sortItems[2]).classed('active', false);
            break;
        case ('journaltitle'):
            d3.select(sortItems[0]).classed('active', true);
            d3.select(sortItems[1]).classed('active', false);
            d3.select(sortItems[2]).classed('active', false);
            break;
        case ('articleyear'):
            d3.select(sortItems[2]).classed('active', true);
            d3.select(sortItems[0]).classed('active', false);
            d3.select(sortItems[1]).classed('active', false);
            break;
    }

    //Hide all popovers
    $('[data-toggle=popover]').popover('hide');
    //Clear the screen
    paperRow.remove();
    //Clear all database requests
    clearRequests();
    //Change sorting index
    indexToSortPapersOn = indexToSortOn;
    //Draw new papers
    drawPapers(selections);
}

//Sorts the papers using the global value to sort on for the papers
function sortPapers(indexToSortOn, sortedArray) {
    for (var paper in paperData) {
        sortedArray.push([paper, paperData[paper]]);
    }

    //Sort the papers on a particular index
    for (var i = 0; i < sortedArray.length - 1; i++) {
        for (var j = i; j < sortedArray.length; j++) {
            if (indexToSortOn == -1) {
                if (sortedArray[i][1].length < sortedArray[j][1].length) {
                    var temp = sortedArray[i];
                    sortedArray[i] = sortedArray[j];
                    sortedArray[j] = temp;
                }
            } else {
                if (paperText[sortedArray[i][0]][0][indexToSortOn] < paperText[sortedArray[j][0]][0][indexToSortOn]) {
                    var temp = sortedArray[i];
                    sortedArray[i] = sortedArray[j];
                    sortedArray[j] = temp;
                }
            }

        }
    }
}

//Draws all the papers
function drawPapers(titles) {
    //Remove old row
    d3.select("#paperRow").remove();
    //Append a row for all the papers
    paperRow = d3.select("#pills-papers").append("div").attr("class", "row");

    paperData = {};
    //Loop through all selections
    for (var i = 0; i < titles.length; i++) {
        //Split the selection into: Left Bounds, Right Bounds and Year
        var titlesSplit = titles[i].split(":");
        var year = titlesSplit[0].substring(0, titlesSplit[0].length);

        titlesSplit = titlesSplit[1].trim().split("-");
        var leftBoundary = titlesSplit[0].substring(0, titlesSplit[0].indexOf("%"));
        var rightBoundary = titlesSplit[1].substring(0, titlesSplit[1].indexOf("%"));

        //Loop through all results for the year
        for (var j = 0; j < yearResults[year].length; j++) {
            //If a result from that year falls under the boundaries
            if (yearResults[year][j][0]['percent'] * 100 >= leftBoundary && yearResults[year][j][0]['percent'] * 100 <= rightBoundary) {

                //If array for the paper doesnt exist, create it
                if (paperData[yearResults[year][j][0]['articleid']] == undefined) {
                    paperData[yearResults[year][j][0]['articleid']] = [];
                }

                //The start sentence for the reference context
                var startSentence = yearResults[year][j][0]['citationsentence'] - sentenceRangeAbove;
                if (startSentence < 0) {
                    startSentence = 0;
                }

                //Iffy fix for the sentence below being a string
                if ((typeof sentenceRangeBelow) == "string") {
                    sentenceRangeBelow = parseInt(sentenceRangeBelow);
                }

                //The end sentence for the reference context
                var endSentence = yearResults[year][j][0]['citationsentence'] + sentenceRangeBelow;


                /*if (boundariesByPaper[yearResults[year][j][0]['articleid']] != undefined) {
                    startSentence = yearResults[year][j][0]['citationsentence'] - boundariesByPaper[yearResults[year][j][0]['articleid']][0];
                    endSentence = yearResults[year][j][0]['citationsentence'] + boundariesByPaper[yearResults[year][j][0]['articleid']][1];
                    console.log(startSentence + " " + endSentence);
                }*/ //CHECK - REMOVING FIXED BOUNDARY ISSUES, BUT MIGHT CAUSE ISSUES WITH PAPER BOUNDARIES


                //Push all relevant data about the reference to the array for the article
                paperData[yearResults[year][j][0]['articleid']].push([]);
                for (var k = 0; k < yearResults[year][j].length; k++) {
                    paperData[yearResults[year][j][0]['articleid']][paperData[yearResults[year][j][0]['articleid']].length - 1].push(
                        [yearResults[year][j][k]['percent'],
                        yearResults[year][j][k]['wordstart'],
                        yearResults[year][j][k]['wordend'],
                        yearResults[year][j][k]['citationstart'],
                        yearResults[year][j][k]['citationend'],
                        yearResults[year][j][k]['citationarticletitle'],
                        yearResults[year][j][k]['citationauthors'],
                        yearResults[year][j][k]['citationyear'],
                            startSentence,
                            endSentence]);
                }
            }
        }
    }


    //Sort the papers
    var temp = [];
    sortPapers(indexToSortPapersOn, temp);

    //Get the needed sentences for each citation context, and place them in their appropriate spot in the array
    for (var paper in temp) {
        var neededBoundaries = [];
        for (var i = 0; i < temp[paper][1].length; i++) {
            var startNeededBoundary = temp[paper][1][i][0][temp[paper][1][i][0].length - 2];
            var endNeededBoundary = temp[paper][1][i][0][temp[paper][1][i][0].length - 1];
            if (!neededBoundaries.includes([startNeededBoundary, endNeededBoundary])) { //Fix - still allows copies in
                neededBoundaries.push([startNeededBoundary, endNeededBoundary]);
            }
        }

        var divContainer = paperRow.append("div").attr("class", "col-xs-* partialpadding"); //Append a column for each paper
        var svgContainer = divContainer.append("svg").attr("width", 115).attr("height", 168); //Container for paper to go into

        boundariesByPaper[temp[paper][0]] = [sentenceRangeAbove, sentenceRangeBelow]; //Used so that each paper has a reference of their boundaries, so that they can change seperate of the rest

        //If the paper text hasnt been downloaded already, download it
        if (paperText[temp[paper][0]] == undefined) {
            prepPaperText(temp[paper][0], neededBoundaries, svgContainer, false);
        } else {
            console.log("using exisiting paper data");
            getPaperBoundary(temp[paper][0], neededBoundaries, svgContainer, false);
        }

    }

    //Hide the popover if a click is made outside any papers
    $('html').on('click', function (e) {
        //Did not click a popover toggle or popover
        if ($(e.target).data('toggle') !== 'popover' && $(e.target).parents('.popover').length === 0) {
            $('[data-toggle="popover"]').popover('hide');
            inTextSelection = [];
            referencesSelected = [];

            var temp = $('[data-toggle=popover]');
            for (var i = 0; i < temp.length; i++) {
                drawBorder(d3.select(temp[i].parentNode).select("#paperRect"), true);
            }
        }

    });

}

//Draws a specific paper and adds popover content (references)
function drawPaper(sizex, sizey, activeLines, activeLinesPercents, svgContainer, articleid, display) {
    console.log("wrong draw paper")
    //Filter for dropshadows
    // var filter = svgContainer.append("defs").append("filter")
    //     .attr("id", "dropshadowPaper")
    //     .attr("height", "130%");
    // filter.append("feOffset")
    //     .attr("result", "offOut")
    //     .attr("in", "SourceGraphic")
    //     .attr("dx", 0)
    //     .attr("dy", 2);
    // filter.append("feColorMatrix")
    //     .attr("result", "matrixOut")
    //     .attr("in", "offOut")
    //     .attr("type", "matrix")
    //     .attr("values", "0.2 0 0 0 0 0 0.2 0 0 0 0 0 0.2 0 0 0 0 0 1 0");
    // filter.append("feGaussianBlur")
    //     .attr("result", "blurOut")
    //     .attr("in", "matrixOut")
    //     .attr("stdDeviation", 2);
    // filter.append("feBlend")
    //     .attr("in", "SourceGraphic")
    //     .attr("in2", "blurOut")
    //     .attr("mode", "normal");

    // //Rectangle for the paper
    // var paperRect = svgContainer.append("rect")
    //     .attr("x", 3)
    //     .attr("y", 3)
    //     .attr("rx", 3)
    //     .attr("xy", 3)
    //     .attr("width", sizex)
    //     .attr("height", sizey)
    //     .attr("id", "paperRect")
    //     .attr("filter", "url(#dropshadowPaper)")
    //     .style("fill", d3.rgb(248, 249, 250));

    // //Calculation to figure out the max lines possible and padding needed (messy - rewrite if can)
    // var lineSizeY = 3;
    // var numOfLines = activeLines.length;
    // var minLinePadding = (sizey - (numOfLines * lineSizeY)) / (numOfLines + 1);

    // //Draw the lines with padding needed
    // var locationXStart = 3 + sizex * 0.1;
    // var locationXEnd = (sizex * 0.9) + 3;
    // var locationY = 4 + minLinePadding;

    // for (var i = 0; i < activeLines.length; i++) {
    //     //Change color if they should be selected
    //     var color = d3.rgb(248, 249, 250);
    //     if (activeLines[i] == true) {
    //         color = colors(activeLinesPercents[i]);
    //     }

    //     var line = svgContainer.append("line") // attach a line
    //         .style("stroke", color) // colour the line
    //         .attr("x1", locationXStart) // x position of the first end of the line
    //         .attr("y1", locationY) // y position of the first end of the line
    //         .attr("x2", locationXEnd) // x position of the second end of the line
    //         .attr("y2", locationY)
    //         .attr('stroke-width', lineSizeY);
    //     locationY += minLinePadding + lineSizeY;
    // }

    // //Creates a filter for the little notification circle applied to the papers
    // filter = svgContainer.append("defs").append("filter")
    //     .attr("id", "dropshadowCircle")
    //     .attr("height", "130%");
    // filter.append("feOffset")
    //     .attr("result", "offOut")
    //     .attr("in", "SourceGraphic")
    //     .attr("dx", 0)
    //     .attr("dy", 1);
    // filter.append("feColorMatrix")
    //     .attr("result", "matrixOut")
    //     .attr("in", "offOut")
    //     .attr("type", "matrix")
    //     .attr("values", "0.1 0 0 0 0 0 0.1 0 0 0 0 0 0.1 0 0 0 0 0 1 0");
    // filter.append("feGaussianBlur")
    //     .attr("result", "blurOut")
    //     .attr("in", "matrixOut")
    //     .attr("stdDeviation", 0.5);
    // filter.append("feBlend")
    //     .attr("in", "SourceGraphic")
    //     .attr("in2", "blurOut")
    //     .attr("mode", "normal");

    // //Draw the notification circle but don't show it
    // svgContainer.append("rect")
    //     .attr("x", sizex * 0.86)
    //     .attr("y", sizey * 0.90)
    //     .attr("rx", 15)
    //     .attr("xy", 15)
    //     .attr("width", 10)
    //     .attr("height", 10)
    //     .attr("filter", "url(#dropshadowCircle)")
    //     .attr("id", "unfinishedCircle")
    //     .attr("display", "none");


    // //Append the relevant paper data in the popover
    // var popover = d3.select("#popover_text");
    // popover.html("");
    // popover.append("h2").text(paperText[articleid][0]['articletitle'] + " (" + paperText[articleid][0]['articleyear'] + ") (" + articleid + ") (" + paperText[articleid][0]['journaltitle'] + ")");
    // popover.append("h6").text("Boundaries are: " + boundariesByPaper[articleid][0] + " above and " + boundariesByPaper[articleid][1] + " below");

    // //Append each reference context
    // for (var i = 0; i < paperData[articleid].length; i++) {
    //     var tempText = "";

    //     //Append a container
    //     var listEntry = popover.append("ul").attr("class", "list-group");
    //     listEntry = listEntry.append("li").attr("class", "list-group-item").attr("id", articleid); //Not standard, but works
    //     //Onclick code to keep track of selected references incase they are added
    //     listEntry.attr("onclick", "selectPaperViewBoundary(this); updateReferencesSelected([this.id, this.innerHTML, paperText[this.id][0]['articletitle'], paperText[this.id][0]['articleyear'], paperText[this.id][0]['journaltitle'], paperText[this.id][0]['papertext'].length]);");

    //     var lastSplitIndex = paperData[articleid][i][0][8][0]; //Index used to figure out where the paper text was last split on
    //     //If the context has a space at the beginning, skip it
    //     if (paperText[articleid][0]['papertext'].charAt(lastSplitIndex) == ' ') {
    //         lastSplitIndex += 1;
    //     }
    //     var endTextIndex = paperData[articleid][i][0][9][1]; //Index for the end of the context


    //     var tempLocations = []; //Holds the citation and word(s) locations
    //     //Pushes the citation
    //     tempLocations.push([paperData[articleid][i][0][3] - 1,
    //     paperData[articleid][i][0][4],
    //         true]);
    //     //and the word(s) location(s)
    //     for (var j = 0; j < paperData[articleid][i].length; j++) { //Loops length of query times
    //         tempLocations.push([paperData[articleid][i][j][1],
    //         paperData[articleid][i][j][2],
    //             false]);
    //     }

    //     //Sorts the locations so that the item occuring first in the text is highlighted first, as not to go backward in the text
    //     for (var j = 0; j < tempLocations.length; j++) {
    //         for (var k = j + 1; k < tempLocations.length; k++) {
    //             if (tempLocations[j][0] > tempLocations[k][0]) {
    //                 var temp = tempLocations[j];
    //                 tempLocations[j] = tempLocations[k];
    //                 tempLocations[k] = temp;
    //             }
    //         }
    //     }

    //     tempText += '"';
    //     //Loop through the locations
    //     //Works by getting text before word/citation, then adding the word/citation
    //     //Loops until all data is in
    //     for (var j = 0; j < tempLocations.length; j++) {
    //         if (tempLocations[j][0] != lastSplitIndex) {
    //             //End location of the item
    //             var tempEndIndex = tempLocations[j][0];
    //             //A fix if the word starts at a space
    //             if (paperText[articleid][0]['papertext'][tempEndIndex] == ' ') {
    //                 tempEndIndex += 1;
    //             }

    //             //Get all the text before the item
    //             tempText += paperText[articleid][0]['papertext'].substring(lastSplitIndex, tempEndIndex);
    //         }

    //         //If the value is true, it is a citation, and span it a different color
    //         //else, just use mark for yellow
    //         if (tempLocations[j][2] == true) {
    //             tempText += "<span style='background-color: #9DC4DF'>";
    //         } else {
    //             tempText += "<mark>";
    //         }
    //         //Get the word/citation
    //         tempText += paperText[articleid][0]['papertext'].substring(tempLocations[j][0], tempLocations[j][1] + 1);
    //         if (tempLocations[j][2] == true) {
    //             tempText += "</span>";
    //         } else {
    //             tempText += "</mark>";
    //         }
    //         lastSplitIndex = tempLocations[j][1] + 1;
    //     }
    //     //Add the rest of the context's data
    //     tempText += paperText[articleid][0]['papertext'].substring(lastSplitIndex, endTextIndex + 1);
    //     //End the text and pad it a little
    //     tempText += '"';
    //     tempText += "<br><br><i>";

    //     //Add the citation information at the end in italics
    //     if (paperData[articleid][i][0][6] != "") {
    //         tempText += paperData[articleid][i][0][6] + ". "; //Author
    //     }
    //     if (paperData[articleid][i][0][5] != "") {
    //         tempText += paperData[articleid][i][0][5] + ". "; //Referenced Paper Name
    //     }
    //     if (paperData[articleid][i][0][7] != "") {
    //         tempText += paperData[articleid][i][0][7] + ". "; // Year
    //     }
    //     tempText += "</i>";
    //     //Set the popover's text to the data just made
    //     listEntry.html(tempText);
    //     //Append "br" for padding
    //     popover.append("br");
    // }

    // //The hitbox used to detect clicks on the entire glyph
    // var squareHitBox = svgContainer.append("rect")
    //     .attr("x", 3)
    //     .attr("y", 3)
    //     .attr("rx", 3)
    //     .attr("xy", 3)
    //     .attr("width", sizex)
    //     .attr("height", sizey)
    //     .attr("data-toggle", "popover")
    //     .attr("id", articleid + "_" + paperText[articleid][0]['articleyear'])
    //     .attr("data-content", $('#popover_content_wrapper').html()) //Set the popover content to display custom html
    //     .style("fill", "rgba(0,0,0,0)");

    // $(squareHitBox.node()).popover({ html: true, container: 'body' }); //This is the cause of the slowdown - enables popups on all papers
    // $(squareHitBox.node()).on('click', function (e) { //Allows only one popup at a time - if a popup other than the one clicked is active, it is hidden
    //     //If the paper is clicked, hide all other papers open at the moment
    //     $('[data-toggle=popover]').not(this).popover('hide');

    //     //Reset selection data that was not added
    //     inTextSelection = [];
    //     referencesSelected = [];

    //     //Still a work in progress - was used to change the notification circle's color from green to red but its not done yet
    //     /*var id = d3.select(this).attr('id');
    //     id = id.substring(0, id.indexOf('_'));
    //     if(buttonsSelected[id] == null){
    //         buttonsSelected[id] = [0,0,0];
    //     }*/


    //     var temp = $('[data-toggle=popover]').not(this);
    //     //Remove a border on all the unselected objects
    //     for (var i = 0; i < temp.length; i++) {
    //         drawBorder(d3.select(temp[i].parentNode).select("#paperRect"), true);
    //     }

    //     //If the paper was recently selected (checked by looking at the stroke on the paper), then add a stroke
    //     if (d3.select(this.parentNode).select("#paperRect").style("stroke") == "none") {
    //         drawBorder(d3.select(this.parentNode).select("#paperRect"), false);
    //         currentPaperIndicator = d3.select(this.parentNode).select("#unfinishedCircle");
    //         currentPaperSelected = d3.select(this.parentNode);
    //     } else { //Else remove the stroke - the paper is being unselected
    //         drawBorder(d3.select(this.parentNode).select("#paperRect"), true);
    //         currentPaperIndicator = null;
    //         $(this).popover('hide');
    //     }


    // });

    // //Used to tell if the specific paper's popover should be shown immediately after creation - used when changing boundaries
    // if (display == true) {
    //     //Simulates mouse click on the paper
    //     jQuery.fn.d3Click = function () { //Used to click the d3 object (svg)
    //         this.each(function (i, e) {
    //             var evt = new MouseEvent("click");
    //             e.dispatchEvent(evt);
    //         });
    //     };

    //     if (d3.select("#pills-papers-tab").classed('active')) {
    //         $(squareHitBox.node()).d3Click();
    //     }
    // }

}

//Draws the first column (the paper on the home screen)
function drawFirstColumn(sizex, sizey, colsize, svgContainer, numOfLines) {
    //Filter for dropshadows
    var filter = svgContainer.append("defs").append("filter")
        .attr("id", "dropshadowInitial")
        .attr("height", "130%");
    filter.append("feOffset")
        .attr("result", "offOut")
        .attr("in", "SourceGraphic")
        .attr("dx", 0)
        .attr("dy", 2);
    filter.append("feColorMatrix")
        .attr("result", "matrixOut")
        .attr("in", "offOut")
        .attr("type", "matrix")
        .attr("values", "0.2 0 0 0 0 0 0.2 0 0 0 0 0 0.2 0 0 0 0 0 1 0");
    filter.append("feGaussianBlur")
        .attr("result", "blurOut")
        .attr("in", "matrixOut")
        .attr("stdDeviation", 2);
    filter.append("feBlend")
        .attr("in", "SourceGraphic")
        .attr("in2", "blurOut")
        .attr("mode", "normal");


    //Values are used to determine padding of the lines in the paper
    var lineSizeY = 3;
    var minLinePadding = 12;

    var increment = 1;
    if (numOfLines > 10) {
        numOfLines = 11;
        increment = 9.9;
    }

    sizey = (lineSizeY + minLinePadding) * numOfLines + minLinePadding;
    //var locationY = (28.92466 * numOfLines) + 32.43487; //Used to determine where the paper should go (middle of all the y values)
    //var locationY = 30 + (((100 / currIncrement) / 2) * currBoxHeight) - (sizey / 2);
    var locationY = 30 + (((100 / currIncrement) * (currBoxHeight + currBoxPadding)) / 2) - (sizey / 2);

    //Draw the paper
    svgContainer.append("rect")
        .attr("x", 3)
        .attr("y", locationY)
        .attr("rx", 3)
        .attr("xy", 3)
        .attr("width", sizex)
        .attr("height", sizey)
        .attr("filter", "url(#dropshadowInitial)")
        .style("fill", d3.rgb(248, 249, 250));


    //Draw the lines with padding needed
    var locationXStart = 3 + sizex * 0.1;
    var locationXEnd = (sizex * 0.9) + 3;
    var lineLocationEnd = 30 + (currBoxHeight / 2);
    locationY += minLinePadding;

    var j = 0;
    for (var i = 0; i < (100 / currIncrement); i += increment) {
        //Change color if they should be selected
        var color = "rgb(204,206,209)";
        var line = svgContainer.append("line") // attach a line
            .style("stroke", color) // colour the line
            .attr("x1", locationXStart) // x position of the first end of the line
            .attr("y1", locationY) // y position of the first end of the line
            .attr("x2", locationXEnd) // x position of the second end of the line
            .attr("y2", locationY)
            .attr('stroke-width', lineSizeY);
        var line2 = svgContainer.append("line") // attach a line
            .style("stroke", color) // colour the line
            .attr("x1", locationXEnd - 0.7) // x position of the first end of the line
            .attr("y1", locationY) // y position of the first end of the  line
            .attr("x2", locationXEnd + 70) // x position of the second end of the line
            .attr("y2", lineLocationEnd)
            .attr('stroke-width', lineSizeY);
        var line3 = svgContainer.append("line") // attach a line
            .style("stroke", color) // colour the line
            .attr("x1", locationXEnd + 69.03) // x position of the first end of the line
            .attr("y1", lineLocationEnd) // y position of the first end of the line
            .attr("x2", locationXEnd + 85) // x position of the second end of the line
            .attr("y2", lineLocationEnd)
            .attr('stroke-width', lineSizeY);

        //Seperation labels used to describe the area of the paper shown
        var sepLabel = svgContainer.append("text")
            .attr("x", locationXEnd + 120)
            .attr("y", lineLocationEnd + 4)
            .attr("id", "sepLabel_" + (Math.floor(i)).toString())
            .style("font-size", "13px")
            .style("text-anchor", "middle")
            .style("fill", d3.rgb(108, 117, 125))
            .text(seperations[Math.floor(i)]);

        //If the seperation label is shown, process the selection
        d3.select("#" + "sepLabel_" + (Math.floor(i)).toString()).on("click", function () {
            d3.event.stopPropagation();

            //If shift was pressed, then dont process the selection and keep the previous selections
            //Else clear previous selections, and process this one
            var shiftPressed = false;
            if (d3.event.shiftKey) {
                shiftPressed = true;
            } else {
                removeAllSelections();
            }

            //Go through all minisquares, if they're on the same line get their year and run it through the selection function
            for (var j = 0; j < miniSquares.length; j++) {
                if (d3.event.target.id.substring(d3.event.target.id.indexOf("_") + 1, d3.event.target.id.length) == miniSquares[j].substring(miniSquares[j].substring(9, miniSquares[j].length - 1).indexOf("_") + 10, miniSquares[j].length)) {
                    var currSelection = miniSquares[j].substring(9, miniSquares[j].substring(9, miniSquares[j].length - 1).indexOf("_") + 9) + ": " + d3.select("#" + d3.event.target.id).text();
                    multipleSelection(currSelection, true, shiftPressed, d3.select("#" + miniSquares[j]));
                }

            }

            //Switch to the papers if shift wasnt pressed
            if (shiftPressed == false) {
                switchToPapers(selections);
            }
        })

        //Increment the location for the lines on the paper
        locationY += minLinePadding + lineSizeY;

        //TODO: The lines on the paper glpyh are very close, but not exactly lined up with the row it represents
        lineLocationEnd += ((currBoxPadding + currBoxHeight) * increment);

        //Push the lines used in the glpyh so that the color can be dynamically updated when other columns load
        paperGlyphLines.push([]);
        paperGlyphLines[j].push([line, line2, line3]);
        seperationLabels.push(sepLabel);
        j += 1;
    }


    //Push the array for the line colors
    for (var i = 0; i < numOfLines; i++) {
        lineColors.push([]);
        lineColors[i].push([], [], []);
    }
}

//Draw the column on the main screen
function drawColumn(label, containerSizeW, miniSquareSizeX, miniSquareSizeY, svgContainer, currentPrecents, currentData) {
    //Filter for dropshadows
    var filter = svgContainer.append("defs").append("filter")
        .attr("id", "dropshadowSquare")
        .attr("height", "130%");
    filter.append("feOffset")
        .attr("result", "offOut")
        .attr("in", "SourceGraphic")
        .attr("dx", 0)
        .attr("dy", 2);
    filter.append("feColorMatrix")
        .attr("result", "matrixOut")
        .attr("in", "offOut")
        .attr("type", "matrix")
        .attr("values", "0.2 0 0 0 0 0 0.2 0 0 0 0 0 0.2 0 0 0 0 0 1 0");
    filter.append("feGaussianBlur")
        .attr("result", "blurOut")
        .attr("in", "matrixOut")
        .attr("stdDeviation", 2);
    filter.append("feBlend")
        .attr("in", "SourceGraphic")
        .attr("in2", "blurOut")
        .attr("mode", "normal");

    //Year container
    var verticalContainer = svgContainer.append("rect")
        .attr("x", 3)
        .attr("y", 3)
        .attr("rx", 3)
        .attr("xy", 3)
        .attr("width", containerSizeW)
        .attr("filter", "url(#dropshadowSquare)")
        .style("fill", d3.rgb(248, 249, 250));

    //Label on the year container
    svgContainer.append("text")
        .attr("x", (containerSizeW / 2) + 3)
        .attr("y", 21)
        .attr("text-anchor", "middle")
        .style("fill", d3.rgb(108, 117, 125))
        .text(label);

    //Year container hitbox
    var verticalContainerHitbox = svgContainer.append("rect")
        .attr("x", 3)
        .attr("y", 3)
        .attr("rx", 3)
        .attr("xy", 3)
        .attr("width", containerSizeW)
        .attr("height", containerSizeW)
        .style("fill", "rgba(0,0,0,0)"); // <-- used to make transparent

    //Total on the year container
    var totalText = svgContainer.append("text")
        .attr("x", (containerSizeW / 2) + 3)
        .attr("y", 21)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", d3.rgb(108, 117, 125))
        .text(0);

    //Draw the mini squares with padding needed
    var locationX = 3 + containerSizeW * 0.1;
    var locationY = 30;

    var lineColorIndex = 0;
    var total = 0;
    for (var i = 0; i < currentPrecents.length; i++) {
        //Percent used for box color
        var percent = currentPrecents[i];
        var miniSquareColor = colors(percent);

        //Get the color of the box, and update the line colors on the papre glyph
        var rgb = miniSquareColor.split(",");
        lineColors[Math.floor(lineColorIndex)][0].push(parseInt(rgb[0].substring(4, rgb[0].length)));
        lineColors[Math.floor(lineColorIndex)][1].push(parseInt(rgb[1]));
        lineColors[Math.floor(lineColorIndex)][2].push(parseInt(rgb[2].substring(0, rgb[2].length - 1)));

        var redNew = 0;
        var greenNew = 0;
        var blueNew = 0;
        for (var j = 0; j < lineColors[Math.floor(lineColorIndex)][0].length; j++) {
            redNew += lineColors[Math.floor(lineColorIndex)][0][j];
            greenNew += lineColors[Math.floor(lineColorIndex)][1][j];
            blueNew += lineColors[Math.floor(lineColorIndex)][2][j];
        }
        redNew /= lineColors[Math.floor(lineColorIndex)][0].length;
        greenNew /= lineColors[Math.floor(lineColorIndex)][0].length;
        blueNew /= lineColors[Math.floor(lineColorIndex)][0].length;

        var lineColor = "rgb(" + redNew + "," + greenNew + "," + blueNew + ")"
        for (var j = 0; j < paperGlyphLines[Math.floor(lineColorIndex)][0].length; j++) {
            paperGlyphLines[Math.floor(lineColorIndex)][0][j].style('stroke', lineColor);
        }

        //Create the ID for the miniSquare's hitbox
        var miniSquareHitboxID = "minSqrHB_" + label + "_" + i.toString();
        miniSquares.push(miniSquareHitboxID); //Store the minisquare's id

        //Draw the miniSquare
        if (currBoxHeight < 15) {
            boxText = "";
        }
        drawColumnSquare(svgContainer, locationX, locationY, miniSquareSizeX, miniSquareSizeY, miniSquareColor, currentData[i], miniSquareHitboxID);
        total += currentData[i];



        //Increment the main box's location
        locationY += miniSquareSizeY + currBoxPadding;
        lineColorIndex += (lineColors.length / currentPrecents.length);
    }

    verticalContainer.attr("height", locationY); //Change the height to be the max allowed
    verticalContainerHitbox.attr("height", locationY); //Change the height to be the max allowed
    totalText.attr("y", locationY + 20); //Change the location of the total label
    totalText.text(shortenVal(total)); //Change the total label data
    svgContainer.attr("height", locationY + 25); //Change the height of the container for the svg objects so no clipping occurs

    //On click select the year
    verticalContainerHitbox.on("click", function () {
        d3.event.stopPropagation();

        //If shift is pressed, dont process the selection - else do
        var shiftPressed = false;
        if (d3.event.shiftKey) {
            shiftPressed = true;
        } else {
            removeAllSelections();
        }

        for (var i = 0; i < miniSquares.length; i++) {
            var tmp = miniSquares[i].split("_");
            if (tmp[1] == label) {
                var currSelection = tmp[1] + ": " + (parseInt(tmp[2]) * currIncrement) + "%-" + ((parseInt(tmp[2]) * currIncrement) + currIncrement) + "%";
                //MultipleSelection() deals with having a variety of selections, and when to process them
                multipleSelection(currSelection, true, shiftPressed, d3.select("#" + miniSquares[i]));
            }
        }

        //Switch to the papers if shift is not pressed
        if (shiftPressed == false) {
            switchToPapers(selections);
        }
    });
}

//Draws the indiviual squares on the main screen
//Requires the container, location, size, color, text to put on, and the id for the box
//ID must be in the format xxx_year_numOfBox for selection to work
function drawColumnSquare(svgContainer, locationX, locationY, sizeX, sizeY, miniSquareColor, labelData, miniSquareID) {
    //Draw square
    miniSquaresObjects.push(svgContainer.append("rect")
        .attr("x", locationX)
        .attr("y", locationY)
        .attr("width", sizeX)
        .attr("height", sizeY)
        .attr("id", miniSquareID)
        .style("fill", miniSquareColor));


    //Used to change the text color if the background is too dark
    var percentLabelColor = "#FFFFFF";
    if (tinycolor(miniSquareColor).isLight()) {
        percentLabelColor = d3.rgb(69, 74, 80);
    }

    if (currBoxHeight >= 15) {
        //Draw the hit amount label
        miniSquareText.push(svgContainer.append("text")
            .attr("x", locationX + (sizeX / 2))
            .attr("y", locationY + (sizeY * 0.5) + 6)
            .attr("text-anchor", "middle")
            .attr("id", labelData)
            .style("fill", percentLabelColor)
            .style("font-size", "13px")
            .text(shortenVal(labelData)));
    }


    //The mini square's hitbox to select it
    var miniSquareHitbox = svgContainer.append("rect")
        .attr("x", locationX)
        .attr("y", locationY)
        .attr("width", sizeX)
        .attr("height", sizeY)
        .style("fill", "rgba(0,0,0,0)")
        .attr("id", miniSquareID);

    miniSquareHitbox.on("mouseover", function () {

        d3.select("#tooltip").transition()
            .duration(300)
            .style("opacity", .9);
        d3.select("#tooltip").html(shortenVal(labelData))
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
    }).on("mouseout", function () {
        d3.select("#tooltip").transition()
            .duration(500)
            .style("opacity", 0);
    });



    //Allow the mini squares to call the main squares function since they cover it
    miniSquareHitbox.on("click", function () {
        d3.event.stopPropagation();

        //If shift is pressed, dont process the selection - else do
        var shiftPressed = false;
        if (d3.event.shiftKey) {
            shiftPressed = true;
        }

        //Prune the id string of the clicked item (minSqrHB_YEAR_NUM) to get NUM
        var tmp = (d3.event.target.id.substring(d3.event.target.id.indexOf("_") + 1, d3.event.target.id.length))
        //MultipleSelection() deals with having a variety of selections, and when to process them
        //multipleSelection(tmp.substring(0, tmp.indexOf("_")) + ": " + seperationLabels[parseInt(tmp.substring(tmp.indexOf("_") + 1, d3.event.target.id.length))].text(), false, shiftPressed, d3.select("#" + d3.event.target.id));
        multipleSelection(tmp.substring(0, tmp.indexOf("_")) + ": " + (tmp.substring(tmp.indexOf("_") + 1, tmp.length) * currIncrement).toString() + "%-" + ((parseInt(tmp.substring(tmp.indexOf("_") + 1, tmp.length)) + 1) * currIncrement).toString() + "%", false, shiftPressed, d3.select("#" + d3.event.target.id));

        //Switch to the papers if shift is not pressed
        if (shiftPressed == false) {
            switchToPapers(selections);
        }
    });


}

//Draws or removes a border around a object
function drawBorder(object, remove) {
    if (remove == true) {
        object.style('stroke', "none");
    } else {
        var percentLabelColor = "rgb(108,117,125)";
        //if(tinycolor(object.style("fill")).isDark()){
        //	percentLabelColor = "#FFFFFF";
        //}
        object.style('stroke', percentLabelColor);
        object.style('stroke-width', 2);
    }
}

//Used to adapt selections to different increments or boundaries
function adaptSelection(year) {

    //Get the old selections
    var oldSelections = [];
    for (var i = 0; i < selections.length; i += 0) {
        if (parseInt(selections[i].split(":")[0]) == year) {
            oldSelections.push(selections[i]);
            selections.splice(i, 1);
            //selectionObjects.splice(i,1);
        } else {
            i += 1;
        }
    }


    //Loop through the new selections boundaries, if the old selections fall under it or vice versa, select it
    for (var i = 0; i < oldSelections.length; i++) {
        //Get the year, left and right ranges from the old selections
        var rangeYear = parseInt(oldSelections[i].split(":")[0]);

        var tmp = oldSelections[i].split(" ")[1];
        var rangeLeft = parseInt(tmp.substring(0, tmp.indexOf("%")));

        tmp = oldSelections[i].split("-")[1];
        var rangeRight = parseInt(tmp.substring(0, tmp.indexOf("%")));

        for (var j = 0; j < miniSquares.length; j += 1) {
            tmp = miniSquares[j].split("_");
            //This checks if the old selection falls within the new one and vice versa
            if (
                parseInt(tmp[1]) == rangeYear &&
                (
                    (
                        (
                            (((parseInt(tmp[2]) * currIncrement) >= rangeLeft) && ((parseInt(tmp[2]) * currIncrement) + currIncrement <= rangeRight)) //Used to check new increments
                            ^ (((parseInt(tmp[2]) * currIncrement) <= rangeLeft) && ((parseInt(tmp[2]) * currIncrement) + currIncrement >= rangeRight))
                        ) ||
                        ((parseInt(tmp[2]) * currIncrement) < rangeLeft && rangeLeft < ((parseInt(tmp[2]) * currIncrement) + currIncrement))
                        ||
                        ((parseInt(tmp[2]) * currIncrement) < rangeRight && rangeRight < ((parseInt(tmp[2]) * currIncrement) + currIncrement))
                    ) ||
                    (
                        parseInt(tmp[2]) == rangeLeft / currIncrement //Used to check for same increments
                    )
                )
            ) {
                //Select the new selection
                var currSelection = tmp[1] + ": " + (parseInt(tmp[2]) * currIncrement) + "%-" + ((parseInt(tmp[2]) * currIncrement) + currIncrement) + "%";
                if (!selections.includes(currSelection)) {
                    multipleSelection(currSelection, false, true, d3.select("#" + miniSquares[j]));
                }
            }

        }
    }
}

//Used to remove all user selections and remove their stroke / highlight
function removeAllSelections() {
    selections = [];
    for (var i = 0; i < selectionObjects.length; i++) {
        drawBorder(selectionObjects[i], true);
    }
    selectionObjects = [];
}

//Used for when multiple selections are made
function multipleSelection(currSelection, column, shiftPressed, object) {
    //Create an array full of the selections

    //If the array doesnt have the selection already
    if (!selections.includes(currSelection)) {
        //If shift WASNT pressed and this is NOT a column that is being selected, then remove all selections
        if (shiftPressed == false && column == false) {
            removeAllSelections();
        } else {
            //Remove any value within the year and replace the selection with just the whole year
            for (var i = 0; i < selections.length; i++) {
                if (selections[i] == currSelection.substring(0, 4)) {
                    selections.splice(i, 1);
                    drawBorder(selectionObjects[i], true);
                    selectionObjects.splice(i, 1);
                    break;
                }
            }
        }
        //Push the current selection to the list of selections
        selections.push(currSelection);
        //Draw a border around the object clicked and add it to the array of objects selected
        drawBorder(object, false);
        selectionObjects.push(object);
    } else if (shiftPressed == true) {
        //If is in the array already, remove it and remove the border/object
        var i = selections.indexOf(currSelection);
        selections.splice(i, 1);

        drawBorder(selectionObjects[i], true);
        selectionObjects.splice(i, 1);

    }

}

//Runs a function with a timeout
function executeAsync(func, timeout) {
    setTimeout(func, timeout);
}

//Used to change the height of the popover in the paper view when clicking the "change boundaries" button
function cycleVisibility(item) {
    var items = [item.parentElement.parentElement.childNodes[9].childNodes[1],
    item.parentElement.parentElement.childNodes[11].childNodes[1],
    item.parentElement.parentElement.childNodes[13].childNodes[1],
    item.parentElement.parentElement.childNodes[15].childNodes[1]];

    var mainPage = [item.parentElement.parentElement.parentElement.parentElement.parentElement.childNodes[1],
    item.parentElement.parentElement.parentElement.parentElement.parentElement.childNodes[10]];

    var id = currentPaperSelected.selectAll('rect').filter(function (d, i) { return i === 2; }).attr('id');

    if (d3.select(items[0]).style("display") == "none") { //unhide
        d3.select(mainPage[0]).style('height', '90px');
        d3.select(mainPage[0]).style('margin-top', '5px');
        d3.select(mainPage[1]).style('height', '335px');
        d3.select(mainPage[1]).style('margin-top', '10px');

    } else { //hide

        d3.select(mainPage[0]).style('height', '60px');
        d3.select(mainPage[0]).style('margin-top', '20px');
        d3.select(mainPage[1]).style('height', '365px');
        d3.select(mainPage[1]).style('margin-top', '-20px');
    }

    for (var item in items) {
        var temp = d3.select(items[item]);
        if (temp.style("display") == "none") {
            temp.style("display", null); //unhide
        } else {
            temp.style("display", "none");  // hide
        }
    }
}

//Switch to the home screen and disable buttons
function switchToHome() {
    $('#pills-home-tab').tab('show');
    d3.select('#paperSortButton').style('display', 'none');
    d3.select('#groupByButton').style('display', 'none');
    d3.select('#exportButton').style('display', 'none');
}

function switchToPapers(sections) {
    //Clear the previous paper requests
    clearRequests(false, true);

    //Allows the user access to the papers page once they've selected an item
    if (document.getElementById("pills-papers-tab").classList.contains('disabled')) {
        document.getElementById("pills-papers-tab").classList.remove("disabled");
    }
    d3.select("#pills-papers").selectAll("*").remove(); //Remove all objects that might still be there

    //Remove the paper row - append a message about the slow computation time, and run the search for the papers
    d3.select("#paperRow").remove();
    var paperRow = d3.select("#pills-papers").append("div").attr("class", "row justify-content-center").attr("id", "paperRow");
    paperRow.append("div").attr("class", "alert alert-warning alert-dismissible fade show")
        .attr("role", "alert").attr("id", "alert")
        .html("<strong>Please Wait</strong> - the computation might take awhile. <button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>");

    d3.select("#paperSortButton").style("display", null); //Unhide sort button for papers

    $('#pills-papers-tab').tab('show');
    executeAsync(function () { drawPapers(sections); }, 500);
}

//Disable the other buttons for the paper and galaxy views.
function disableAll() {
    if (!document.getElementById("pills-papers-tab").classList.contains('disabled')) {
        document.getElementById("pills-papers-tab").classList.add("disabled");
    }
    if (!document.getElementById("pills-papers-tab").classList.contains('disabled')) {
        document.getElementById("pills-papers-tab").classList.add("disabled");
    }
}

function switchToGalaxies() {
    //Allows the user access to the papers page once they've selected an item
    if (document.getElementById("pills-papers-tab").classList.contains('disabled')) {
        document.getElementById("pills-papers-tab").classList.remove("disabled");
    }
    d3.select("#groupByButton").style("display", null); //Unhide sort button for papers
    $('#pills-galaxies-tab').tab('show');
}

//Creates a container for the paper glpyh on the main screen, and creates containers for the columns
function prepContainers(increment) {
    svgContainers = [];
    d3.select("#homeRow").remove();
    var homeRow = d3.select("#pills-home").append("div").attr("id", "homeRow");
    let distChart = homeRow.append("div").attr("id", "distChart").attr("class", "nopadding");
    let yearCols = homeRow.append("div").attr("id", "years").attr("class", "nopadding");
    for (var i = 0; i < years.length; i++) {
        if (i == 0) {
            var maxFirstContainerSize = 100 / increment;
            if (maxFirstContainerSize > 10) {
                maxFirstContainerSize = 11;
            }
            svgContainers.push(distChart.append("svg").attr("width", 257).attr("height", maxFirstContainerSize * 75));
        }
        svgContainers.push(yearCols.append("div").attr("class", "col-xs-* nopadding").attr("height", 785).append("svg").attr("width", 87));

    }
}

//Get the list of years from the database
function getYears() {
    $.ajax({
        type: 'GET',
        url: currentURL + "years",
        success: function (data) {
            years = data;
        },
        async: true
    });
}

//Filter the results for use in the home screen
function filterYearResults(increment, year) {
    //Clear the arrays
    filteredYearCounts[year] = []; //0 is for reference count, 1 is for paper count
    filteredYearPercents[year] = [];
    var currentArticle = [];

    for (var i = 0; i < maxLabels; i++) {
        filteredYearCounts[year].push([]);
        filteredYearPercents[year].push([]);
        for (var j = 0; j < 100 / increment; j++) {
            currentArticle.push([""]);

            filteredYearCounts[year][i].push(0);
            filteredYearPercents[year][i].push(0);
        }
    }

    //Loop through the results, update the count of papers and the paper reference count
    if (yearResults[year] != undefined) {
        for (var i = 0; i < yearResults[year].length; i++) {
            for (var j = 0; j < 100; j += increment) {
                if (yearResults[year][i][0]['percent'] * 100 <= (j + increment)) {
                    filteredYearCounts[year][0][((j + increment) / increment) - 1] += 1;

                    if (!currentArticle[((j + increment) / increment) - 1].includes(yearResults[year][i][0]['articleid'])) {
                        filteredYearCounts[year][1][((j + increment) / increment) - 1] += 1;
                        currentArticle[((j + increment) / increment) - 1].push(yearResults[year][i][0]['articleid']);
                    }
                    break;
                }
            }
        }
    }



    //Change whether to normalize to all the years, or just to one year
    var yearsToChange = years;
    if (currentNorm == 1) {
        yearsToChange = [{}];
        yearsToChange[0]['articleyear'] = year;
    }

    //Get the percent counts using the max hitcounts
    for (var i = 0; i < maxLabels; i++) {
        var max = filteredYearCounts[years[0]['articleyear']][i][0];
        var min = 0;

        for (var j = 0; j < yearsToChange.length; j++) {
            if (filteredYearCounts[yearsToChange[j]['articleyear']] != undefined) {
                for (var k = 0; k < filteredYearCounts[yearsToChange[j]['articleyear']][i].length; k++) {
                    if (filteredYearCounts[yearsToChange[j]['articleyear']][i][k] > max) {
                        max = filteredYearCounts[yearsToChange[j]['articleyear']][i][k];
                    }
                    if (filteredYearCounts[yearsToChange[j]['articleyear']][i][k] < min) {
                        min = filteredYearCounts[yearsToChange[j]['articleyear']][i][k];
                    }
                }
            }
        }

        for (var j = 0; j < yearsToChange.length; j++) {
            if (filteredYearCounts[yearsToChange[j]['articleyear']] != undefined) {
                for (var k = 0; k < filteredYearCounts[yearsToChange[j]['articleyear']][i].length; k++) {
                    if (max != 0) {
                        filteredYearPercents[yearsToChange[j]['articleyear']][i][k] = (filteredYearCounts[yearsToChange[j]['articleyear']][i][k] - min) / (max - min);
                    } else {
                        filteredYearPercents[yearsToChange[j]['articleyear']][i][k] = 0;
                    }
                }
            }

        }
    }





    /*///Get the percent counts using the max hitcounts
    for (var i = 0; i < maxLabels; i++) {
        var max = filteredYearCounts[year][i][0];
        var min = 0;
        for (var j = 0; j < filteredYearCounts[year][i].length; j++) {
            if (filteredYearCounts[year][i][j] > max) {
                max = filteredYearCounts[year][i][j];
            }
            if (filteredYearCounts[year][i][j] < min) {
                min = filteredYearCounts[year][i][j];
            }
        }
        for (var j = 0; j < filteredYearCounts[year][i].length; j++) {
            if (max != 0) {
                filteredYearPercents[year][i][j] = (filteredYearCounts[year][i][j] - min) / (max - min);
            } else {
                filteredYearPercents[year][i][j] = 0;
            }
        }
    }*/





}

//Used to change the color of an already drawn minisquare with a new, normalized value
function changeSquaresColors() {
    var j = 0;

    //Loop through the results again and apply the new color
    for (var i = 0; i < miniSquaresObjects.length; i++) {
        //Get the year from the current object
        var temp = miniSquaresObjects[i].attr("id").substring(miniSquaresObjects[i].attr("id").indexOf('_') + 1, miniSquaresObjects[i].attr("id").length);
        year = temp.substring(0, temp.indexOf("_"));

        //Change the color of the current minisquare with the new color
        if (filteredYearPercents[year] != undefined) {
            miniSquaresObjects[i].style("fill", colors(filteredYearPercents[year][currentLabel][j]));
            if (miniSquareText[i] != undefined) {
                //Used to change the text color if the background is too dark
                var percentLabelColor = "#FFFFFF";
                if (tinycolor(colors(filteredYearPercents[year][currentLabel][j])).isLight()) {
                    percentLabelColor = d3.rgb(69, 74, 80);
                }
                //console.log(percentLabelColor);
                miniSquareText[i].style("fill", percentLabelColor);
            } else {
                console.log("undefined")
            }
        }

        j += 1;
        if (j >= (100 / currIncrement)) {
            j = 0;
        }
    }
}

//TODO: IMPLEMENT LEFT PAPER % CHANGE AND THE BOX SIZE CHANGE - A SIZE OF 7PX FOR THE BOX AND 1PX FOR THE BOUNDARY SEEMS TO WORK WELL
//Get the results for a search query
function getYearResults(query, year, rangeLeft, rangeRight, increment, index) {
    yearResultsRequests.push($.ajax({
        type: 'POST',
        url: currentURL + "queryCountsTEST",
        data: JSON.stringify({ 'query': query, 'year': year, 'rangeLeft': rangeLeft, 'rangeRight': rangeRight }),
        success: function (data) {
            //Clear the results for the year
            yearResults[year] = [];

            //Offset the loop to catch ngrams
            var loopOffset = query.length;
            if (query.length == 1) {
                loopOffset = 0;
            }
            //Filter the results to catch ngrams, if the words used in the ngram aren't in the same sentence or x sentences away, the entry is removed
            for (var i = 0; i < data.length - loopOffset; i++) {
                var valid = false; //Used to determine whether to add the result
                var temp = [];

                if (query.length == 1) {
                    valid = true;
                    temp.push(data[i]);
                } else {
                    for (var j = 0; j < query.length; j++) {
                        if (data[i + j]['lemma'] == query[j]
                            && data[i + j]['wordsentence'] == data[i + j + 1]['wordsentence']
                            && data[i + j]['citationStart'] == data[i + j + 1]['citationStart']) {
                            valid = true;
                            temp.push(data[i + j]);
                        } else {
                            valid = false;
                            break;
                        }
                    }
                }

                if (valid == true) {
                    //Add the result to the new list
                    yearResults[year].push(temp);
                }
            }

            //Filter the results to be used in the main screen
            filterYearResults(increment, year);

            //Draw the column
            changeSquaresColors();
            drawColumn(year, 80, 64, currBoxHeight, svgContainers[index], filteredYearPercents[year][currentLabel], filteredYearCounts[year][currentLabel]);
            //Adapt the selection from the previous query
            adaptSelection(year);
        },
        async: true,
        timeout: 600000
    }));
}

//Call the search and draw the homescreen for a particular query
// function drawHome(increment) {
//     //Remove the old home row
//     d3.select("#homeRow").remove();
//     d3.select("#clearAllButton").classed('disabled', false);
//     d3.select("#incrementButton").classed('disabled', false);
//     d3.select("#viewByButton").classed('disabled', false);
//     d3.select("#normByButton").classed('disabled', false);

//     if ((100 / increment) * (64 + 10) > 740) {
//         currBoxPadding = 100 / (100 / increment);
//         currBoxHeight = 640 / (100 / increment);
//     } else {
//         currBoxHeight = 64;
//         currBoxPadding = 10;
//     }

//     //If the search went through
//     if (years.length != 0 && years != 0) {
//         //Clear all selections, prep the containers
//         clearAll();
//         seperationChange(increment);
//         prepContainers(increment);

//         //Draw the paper on the left on the main screen
//         var numOfLines = 100 / increment;
//         if (numOfLines > 10) {
//             //numOfLines = 10;
//         }
//         drawFirstColumn(110, (100 / increment) * 16, 80, svgContainers[0], numOfLines);

//         //Search for the query in each year
//         for (var i = 0; i < years.length; i++) {
//             getYearResults(currSearchQuery, years[i]['articleyear'], sentenceRangeAbove, sentenceRangeBelow, increment, i + 1);
//         }
//     } else {
//         var homeRow = d3.select("#pills-home").append("div").attr("class", "row justify-content-center").attr("id", "homeRow");
//         homeRow.append("div").attr("class", "alert alert-warning alert-dismissible fade show")
//             .attr("role", "alert").attr("id", "alert")
//             .html("<strong>Waiting for a response from the server</strong> - please wait for a few seconds and then try searching again. <button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>");

//     }
// }

//Run the search for the desired query
//TODO - prevent SQL injections
function searchForQuery(query) {

    console.log("wrong searchforquery")
    // query = query.split(" ");
    // for (var i = 0; i < query.length; i++) {
    //     query[i] = query[i].toLowerCase();
    // }
    // if (query.toString() != currSearchQuery.toString()) {
    //     removeAllSelections();
    //     currSearchQuery = query; //Remeber to filter input to prevent sql injects
    //     d3.select("#searchQueryLabel").html(currSearchQuery.toString());
    // }

    // for (var key in boundariesByPaper) {
    //     delete boundariesByPaper[key];
    // }
    // var boundariesByPaper = {};
    // indexToSortPapersOn = -1;
    // drawHome(currIncrement);

}

//The current search query
var currSearchQuery = "";


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
