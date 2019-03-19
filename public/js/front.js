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
var min_window_width = 562;

var lineColors = []; //The colors of the lines on the left
var paperGlyphLines = []; //The lines on the paper to the left

var paperRequests = []; //The collection of server requests

var maxLabels = 2; //The max amount of labels per box
var currentLabel = 0; //The current label choice to display on the squares

var currentNorm = 0; //The current normalization, 0 normalizes between years and 1 normalizes within years

var possibleSeperations = [1, 10, 25, 50]; //The possible seperations allowed

var paperRow; //The row that holds all the papers

var filteredYearCounts = {}; //Holds amount of X in each year
var filteredYearPercents = {}; //Holds the percents calculated from the results / total for each year - used in the colors

var svgContainers = []; //Used to hold all the containers used

var years = []; //Used to hold all the years from the server

var yearResults = {}; //Place to store the results from the year
var yearResultsRequests = []; //Place to store the requests made to the server

var currentURL = "http://localhost:5432/"; //The url to access the backend

var currSearchQuery = ""; //The current search query

var process_queue = {}; //process queue of intervals
var overlay_sentiment = false; // flag to immediately show sentiment results

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
function clearRequests(yearRequests, paperRequest, sentimentRequest) {
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
    // clear all sentiment processing requests
    if (sentimentRequest) {
      Object.keys(process_queue).forEach(year => {
        if(process_queue[year] != undefined) {
          process_queue[year].abort();
        }
      });
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
    clearRequests(true, true, true);
}

//Used to shorten integers when they go past 1000, 1000 would go to 1.0k and so on
function shortenVal(value) {
    return value > 999 ? (value / 1000).toFixed(1) + 'k' : value //Not my function
}

//Updates the range text dynamically
function updateTextInput(field, before, after, articleid, sendToDefault) {
    //Get the values to update
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
  // sentiment
  if(choice == 2) {
    Object.keys(score_data).forEach(year => {
      drawSentimentColumn(year);
    });
    $(".sentiment").show();
    overlay_sentiment = true;
    return;
  } else {
    overlay_sentiment = false;
    $(".sentiment").hide();
  }
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

    //Draw the paper only if we have space to do so
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
function drawColumn(label, containerSizeW, miniSquareSizeX, miniSquareSizeY, svgContainer, currentPercents, currentData) {
  $("#container-"+label).removeClass("temp-load");
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
      .style("fill", d3.rgb(248, 249, 250))
      .attr("class", "year-col-"+label);

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
  for (var i = 0; i < currentPercents.length; i++) {
      //Percent used for box color
      var percent = currentPercents[i];
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
      drawColumnSquare(svgContainer, locationX, locationY, miniSquareSizeX, miniSquareSizeY, miniSquareColor, currentData[i], miniSquareHitboxID, label, i);
      total += currentData[i];



      //Increment the main box's location
      locationY += miniSquareSizeY + currBoxPadding;
      lineColorIndex += (lineColors.length / currentPercents.length);
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
function drawColumnSquare(svgContainer, locationX, locationY, sizeX, sizeY, miniSquareColor, labelData, miniSquareID, year, idx) {
    //Draw square
    miniSquaresObjects.push(svgContainer.append("rect")
        .attr("x", locationX)
        .attr("y", locationY)
        .attr("width", sizeX)
        .attr("height", sizeY)
        .attr("id", miniSquareID)
        .style("fill", miniSquareColor)
        .attr("class", year+" minsqr box-"+idx));


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

//Disable the other buttons for the paper and galaxy views.
function disableAll() {
    if (!document.getElementById("pills-papers-tab").classList.contains('disabled')) {
        document.getElementById("pills-papers-tab").classList.add("disabled");
    }
    if (!document.getElementById("pills-papers-tab").classList.contains('disabled')) {
        document.getElementById("pills-papers-tab").classList.add("disabled");
    }
}

//Switch to the home screen and disable buttons
function switchToHome() {
    $('#pills-home-tab').tab('show');
    d3.select('#paperSortButton').style('display', 'none');
    d3.select('#groupByButton').style('display', 'none');
    d3.select('#exportButton').style('display', 'none');
}

//Creates a container for the paper glpyh on the main screen, and creates containers for the columns
function prepContainers(increment) {
    svgContainers = [];
    d3.select("#homeRow").remove();
    var homeRow = d3.select("#pills-home").append("div").attr("id", "homeRow");
    let distChart = homeRow.append("div").attr("id", "distChart").attr("class", "nopadding ");
    let yearCols = homeRow.append("div").attr("id", "years").attr("class", "nopadding ");
    for (var i = 0; i < years.length; i++) {
        if (i == 0) {
            var maxFirstContainerSize = 100 / increment;
            if (maxFirstContainerSize > 10) {
                maxFirstContainerSize = 11;
            }
            let dist_chart_width = 257;
            svgContainers.push(distChart.append("svg")
              .attr("width", dist_chart_width)
              .attr("height", maxFirstContainerSize * 75)
            );
        }
        svgContainers.push(yearCols.append("div")
          .attr("class", "col-xs-* nopadding temp-load")
          .attr("height", 785)
          .attr("id", "container-"+years[i].articleyear)
          .append("svg")
            .attr("width", 87)
            .attr("id", "svg-"+years[i].articleyear)
        );

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
    filteredYearCounts[year] = []; // 0 is for reference count, 1 is for paper count
    filteredYearPercents[year] = []; // ratio between bin freq and max bin freq
    var currentArticle = []; // Holds the unique articleid's from the results

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
                // If the precent in the paper of the current result is less than
                // the current precent (essentially sort the results into bins by year)
                if (yearResults[year][i][0]['percent'] * 100 <= (j + increment)) {
                    // Add 1 to the count for the amount of results in the bin
                    filteredYearCounts[year][0][((j + increment) / increment) - 1] += 1;

                    // If the result's articleid is not found in the found article array (i.e. that is the first result from that paper)
                    // increment the amount of papers in the given bin, then add the articleid to the found article array
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

    //Get the percent counts using the max hitcounts - used for the color on the box
    for (var i = 0; i < maxLabels; i++) {
        var max = 0;
        var min = 0;

        for (var j = 0; j < yearsToChange.length; j++) {
            // If the year isnt undefined
            if (filteredYearCounts[yearsToChange[j]['articleyear']] != undefined) {
                // Calculate the max and min values for the results
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

        // Calculate the average for the results
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
        url: currentURL + "queryCounts",
        data: {
            'query': JSON.stringify(query)
            , 'year': year
            , 'rangeLeft': rangeLeft
            , 'rangeRight': rangeRight
        },
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

            //Process ruleset for this year
            processSignals(query, year);
        },
        async: true,
        timeout: 600000
    }));
}

//Call the search and draw the homescreen for a particular query
function drawHome(increment) {
    //Remove the old home row
    d3.select("#homeRow").remove();
    d3.select("#clearAllButton").classed('disabled', false);
    d3.select("#incrementButton").classed('disabled', false);
    d3.select("#viewByButton").classed('disabled', false);
    d3.select("#normByButton").classed('disabled', false);

    if ((100 / increment) * (64 + 10) > 740) {
        currBoxPadding = 100 / (100 / increment);
        currBoxHeight = 640 / (100 / increment);
    } else {
        currBoxHeight = 64;
        currBoxPadding = 10;
    }

    //If the search went through
    if (years.length != 0 && years != 0) {
        //Clear all selections, prep the containers
        clearAll();
        seperationChange(increment);
        prepContainers(increment);

        //Draw the paper on the left on the main screen
        var numOfLines = 100 / increment;
        if (numOfLines > 10) {
            //numOfLines = 10;
        }
        drawFirstColumn(110, (100 / increment) * 16, 80, svgContainers[0], numOfLines);

        //Search for the query in each year
        for (var i = 0; i < years.length; i++) {
            getYearResults(currSearchQuery, years[i]['articleyear'], sentenceRangeAbove, sentenceRangeBelow, increment, i + 1);
        }
    } else {
        var homeRow = d3.select("#pills-home").append("div").attr("class", "row justify-content-center").attr("id", "homeRow");
        homeRow.append("div").attr("class", "alert alert-warning alert-dismissible fade show")
            .attr("role", "alert").attr("id", "alert")
            .html("<strong>Waiting for a response from the server</strong> - please wait for a few seconds and then try searching again. <button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>");
    }
}

//Show toast notification
function toast(title, text) {
    $(".toast-header .mr-auto").html(title);
    $(".toast-body").html(text);
    $(".toast").toast("show");
}

//Run the search for the desired query
//TODO - prevent SQL injections
function searchForQuery(query) {
    query = query.replace(/[^a-zA-Z ]/g, "").split(" ");
    for (var i = 0; i < query.length; i++) {
        query[i] = query[i].toLowerCase();
    }
    if (query.toString() != currSearchQuery.toString()) {
        removeAllSelections();
        currSearchQuery = query; //Remeber to filter input to prevent sql injects
        d3.select("#searchQueryLabel").html(currSearchQuery.toString());
    }

    for (var key in boundariesByPaper) {
        delete boundariesByPaper[key];
    }
    var boundariesByPaper = {};
    indexToSortPapersOn = -1;
    drawHome(currIncrement);
}

//Poll the progress of a background process until it is done
function pollProcessProgress(process_name, callback) {
    process_queue[process_name] = setInterval(function () {
        $.ajax({
            type: 'GET',
            url: currentURL + "poll?process=" + process_name.serialize(),
            success: function (data) {
                clearInterval(process_queue[process_name]);
            },
            async: true
        });
    }, 1000);
    return;
}

$(document).ready(function () {
    $(".toast").toast({ "delay": 2000 });
});
