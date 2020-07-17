var inTextSelection = []; //The selection inside the paper
var currentPaperIndicator; //The paper's cirlce indicator (used to show if the paper hasnt been completed or if it has been completed)
var currentPaperSelected;

var buttonsSelected = {}; //Used to count the current amount of buttons selected (used to determine if to show the paper indicator)

var boundariesByPaper = {}; //Used to hold the sentence boundaries for each paper
var indexToSortPapersOn = "articleyear"; //The value to sort the papers with

var referencesSelected = []; //The current boundary selections for the current paper

var paperText = {}; //Holds the raw paper text
var paperData = {}; //Holds the paper data - mainly where words, references and sentences are and their locations
var paper_data = {};
var nPaperLoad = 25;
var currentURL = "http://localhost:5434/"; //The url to access the backend

//Used to highlight the references selected
function selectPaperViewBoundary(object) {
  //Select the reference if it hasnt been already, and display the active article icon
  if (!d3.select(object).classed("border-primary")) {
    d3.select(object).classed("border-primary", true);
    inTextSelection.push(object);
  } else {
    d3.select(object).classed("border-primary", false);
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
    if (
      referencesSelected[i][0] == object[0] &&
      referencesSelected[i][1] == object[1]
    ) {
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
  $("[data-toggle=popover]").popover("hide"); //Hide all popups active

  //Change the active button
  switch (newGroup) {
    case 3:
      d3.select("#groupByButton1").classed("active", true);
      d3.select("#groupByButton2").classed("active", false);
      d3.select("#groupByButton3").classed("active", false);
      break;
    case 4:
      d3.select("#groupByButton1").classed("active", false);
      d3.select("#groupByButton2").classed("active", true);
      d3.select("#groupByButton3").classed("active", false);
      break;
    case 5:
      d3.select("#groupByButton1").classed("active", false);
      d3.select("#groupByButton2").classed("active", false);
      d3.select("#groupByButton3").classed("active", true);
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

//Changes the paper boundary and requeries the database
function changePaperTextBoundary(articleid, year) {
  //Hide the popover and remove the glpyh
  var currPaper = currentPaperSelected;
  changingPaper = true;
  $('[data-toggle="popover"]').popover("hide");
  currPaper.selectAll("*").remove();

  //Remove old results from the year screen's data
  var indexToInsert = -1;
  for (var i = 0; i < yearResults[year].length; i++) {
    if (yearResults[year][i][0]["articleid"] == articleid) {
      if (indexToInsert == -1) {
        indexToInsert = i;
      }
      yearResults[year].splice(i, 1);
    }
  }

  //Get new data from the server for the one person
  paperRequests.push(
    $.ajax({
      type: "POST",
      url: currentURL + "queryCountsPaper",
      data: JSON.stringify({
        query: currSearchQuery,
        year: year,
        rangeLeft: boundariesByPaper[articleid][0],
        rangeRight: boundariesByPaper[articleid][1],
        paperid: articleid,
      }),
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
              if (
                data[i + j]["lemma"] == currSearchQuery[j] &&
                data[i + j]["wordsentence"] ==
                  data[i + j + 1]["wordsentence"] &&
                data[i + j]["citationStart"] == data[i + j + 1]["citationStart"]
              ) {
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
          var selectionYear = selectionSplit[0].substring(
            0,
            selectionSplit[0].length
          );

          selectionSplit = selectionSplit[1].trim().split("-");
          var leftBoundary = selectionSplit[0].substring(
            0,
            selectionSplit[0].indexOf("%")
          );
          var rightBoundary = selectionSplit[1].substring(
            0,
            selectionSplit[1].indexOf("%")
          );

          if (selectionYear == year) {
            for (var j = 0; j < data.length; j++) {
              if (
                data[j][0]["percent"] * 100 >= leftBoundary &&
                data[j][0]["percent"] * 100 <= rightBoundary
              ) {
                if (paperData[data[j][0]["articleid"]] == undefined) {
                  paperData[data[j][0]["articleid"]] = [];
                }

                var startSentence =
                  data[j][0]["citationsentence"] -
                  boundariesByPaper[articleid][0]; //Fix - stop from going to 0 or max sentence num for paper

                if (typeof boundariesByPaper[articleid][1] == "string") {
                  boundariesByPaper[articleid][1] = parseInt(rightBoundary);
                }
                var endSentence =
                  data[j][0]["citationsentence"] +
                  boundariesByPaper[articleid][1];

                paperData[data[j][0]["articleid"]].push([]);
                for (var k = 0; k < data[j].length; k++) {
                  paperData[data[j][0]["articleid"]][
                    paperData[data[j][0]["articleid"]].length - 1
                  ].push([
                    data[j][k]["percent"],
                    data[j][k]["wordstart"],
                    data[j][k]["wordend"],
                    data[j][k]["citationstart"],
                    data[j][k]["citationend"],
                    data[j][k]["citationarticletitle"],
                    data[j][k]["citationauthors"],
                    data[j][k]["citationyear"],
                    startSentence,
                    endSentence,
                  ]);
                }
              }
            }
          }
        }

        var neededBoundaries = [];
        for (var i = 0; i < paperData[articleid].length; i++) {
          var startNeededBoundary =
            paperData[articleid][i][0][paperData[articleid][i][0].length - 2];
          var endNeededBoundary =
            paperData[articleid][i][0][paperData[articleid][i][0].length - 1];
          if (
            !neededBoundaries.includes([startNeededBoundary, endNeededBoundary])
          ) {
            //Fix - still allows copies in
            neededBoundaries.push([startNeededBoundary, endNeededBoundary]);
          }
        }
        getPaperBoundary(articleid, neededBoundaries, currPaper, true);
        changingPaper = false;
      },
    })
  );
}

//Gets the paper text for a paper if its needed - then call getPaperBoundary() to set the boundaries for the papers (start and end location)
function prepPaperText(articleid, neededBoundaries, container, display) {
  paperRequests.push(
    $.ajax({
      type: "POST",
      url: currentURL + "paperText",
      data: JSON.stringify({ articleid: articleid }),
      success: function (data) {
        //console.log(paperText);
        paperText[articleid] = data;
        getPaperBoundary(articleid, neededBoundaries, container, display);
      },
      async: true,
      timeout: 600000,
    })
  );
}

//Gets the location of the beginning and the last sentence for the reference, then draws the paper
function getPaperBoundary(articleid, neededBoundaries, container, display) {
  paperRequests.push(
    $.ajax({
      type: "POST",
      url: currentURL + "sectionBoundary",
      data: JSON.stringify({
        articleid: articleid,
        neededBoundaries: neededBoundaries,
      }),
      success: function (data) {
        //Matches the sentencenum to the location
        for (var i = 0; i < paperData[articleid].length; i++) {
          for (var k = 0; k < paperData[articleid][i].length; k++) {
            for (var j = 0; j < data.length; j++) {
              if (
                data[j]["sentencenum"] ==
                paperData[articleid][i][k][
                  paperData[articleid][i][k].length - 2
                ]
              ) {
                paperData[articleid][i][k][
                  paperData[articleid][i][k].length - 2
                ] = [
                  data[j]["startlocationpaper"],
                  data[j]["endlocationpaper"],
                ];
              }
              if (
                data[j]["sentencenum"] ==
                paperData[articleid][i][k][
                  paperData[articleid][i][k].length - 1
                ]
              ) {
                paperData[articleid][i][k][
                  paperData[articleid][i][k].length - 1
                ] = [
                  data[j]["startlocationpaper"],
                  data[j]["endlocationpaper"],
                ];
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
            if (paperData[articleid][j][0][0] <= i / 10) {
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
        drawPaper(
          110,
          160,
          paperDist,
          paperColor,
          container,
          articleid,
          display
        );
      },
      async: true,
      timeout: 600000,
    })
  );
}

//Changes the sorting used by the paper view
function changePaperSort(indexToSortOn) {
  $(".paper-sort").removeClass("active");
  switch (indexToSortOn) {
    case "articleyear":
      $("#sortByYear").addClass("active");
      break;
    case "journaltitle":
      $("#sortByJournal").addClass("active");
      break;
  }
  //Hide all popovers
  $("[data-toggle=popover]").popover("hide");
  //Clear the screen
  // paperRow.remove();
  //Clear all database requests
  // clearRequests();
  //Change sorting index
  indexToSortPapersOn = indexToSortOn;
  //Draw new papers
  // drawPapers();
  drawPapersByIndex(paper_data);
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
        if (
          paperText[sortedArray[i][0]][0][indexToSortOn] <
          paperText[sortedArray[j][0]][0][indexToSortOn]
        ) {
          var temp = sortedArray[i];
          sortedArray[i] = sortedArray[j];
          sortedArray[j] = temp;
        }
      }
    }
  }
}

// Draws all the papers -- rewritten
// instead of holding everything on the client
// retrieve from the server only what we need, as we need it
function drawPapers(signal_id, signal_cat_id) {
  // if we have an associated signal, filter by it
  let values = {
    selections: minimizeSelections(),
    query: currSearchQuery,
    increment: currIncrement,
    rangeLeft: sentenceRangeAbove,
    rangeRight: sentenceRangeBelow,
    lastRank: 0,
    nrank: nPaperLoad,
    signals: {},
    journalid: "",
    isPubmed: CURRENT_DATABASE.isPubmed,
  };

  // add a set of signals based on their category
  if (typeof signal_cat_id != "undefined") {
    for (let id in sentiment_signals) {
      let signal = sentiment_signals[id];
      if (signal.category == signal_cat_id) {
        values["signals"][id] = signal;
      }
    }
  } else {
    // alternatively, filter by a single signal
    if (typeof signal_id != "undefined") {
      values["signals"][signal_id] = sentiment_signals[signal_id];
      for (let f of sentiment_signals[signal_id].filters) {
        values["signals"][f] = sentiment_signals[f];
      }
      for (let f of sentiment_signals[signal_id].restrictions) {
        values["signals"][f] = sentiment_signals[f];
      }
    }
  }
  paperRequests.push(
    $.ajax({
      type: "POST",
      url: "/api/papers",
      contentType: "application/json",
      data: JSON.stringify(values),
      success: function (data) {
        // paper_data = JSON.parse(data);
        paper_data = data;
        drawPapersByIndex(paper_data);
      },
      async: true,
      timeout: 600000,
    })
  );
}

// draw a specific set of papers passed in as input
// this version categorizes the papers by whatever index currently selected
function drawPapersByIndex(results, local_norm = false) {
  $(".paper-norm").removeClass("active");
  if (local_norm) $("#normLocal").addClass("active");
  else $("#normGlobal").addClass("active");

  d3.select("#papers-container").remove();
  d3.select("#paperRow").remove();
  paperRow = d3
    .select("#pills-papers")
    .append("div")
    .attr("class", "container-fluid transition")
    .attr("id", "papers-container");

  let nav = paperRow
    .append("ul")
    .attr("class", "nav nav-tabs mb-3")
    // .append('div')
    // .attr('class','nav nav-tabs nav-justified')
    .attr("id", "papers-container-nav-tabs")
    .attr("role", "tablist");

  active = false;
  for (let year of results.years.sort()) {
    let tab = nav
      .append("li")
      .attr("class", "nav-item")
      .append("a")
      .attr("class", "nav-link")
      .attr("id", `papers-nav-tab-${year}`)
      .attr("data-toggle", "pill")
      .attr("href", `#papers-nav-${year}`)
      .attr("role", "tab")
      .attr("aria-controls", `papers-nav-${year}`);

    if (!active) {
      tab.attr("class", "nav-link active");
      active = true;
    }
    tab.append("h2").text(year);
  }

  let navContent = paperRow
    .append("div")
    .attr("class", "tab-content border")
    .attr("id", "papers-container-nav-content");

  // minimizeDivider();
  let papers = results["papers"];
  let all_max = results["max"];
  // categorize by journal then year
  if (indexToSortPapersOn == "journaltitle") {
  } else {
    // only categorize by years
    active = false;
    for (let y of results.years.sort()) {
      let content = navContent
        .append("div")
        .attr("class", "tab-pane fade")
        .attr("id", `papers-nav-${y}`)
        .attr("role", "tabpanel")
        .attr("aria-labelledby", `papers-nav-tab-${y}`);

      if (!active) {
        content.attr("class", "tab-pane fade active show");
        active = true;
      }

      let yearRow = content
        .append("div")
        .attr("class", "row papers-row")
        .attr("id", "papers-row-" + y);
      // yearRow
      //   .append("div")
      //   .attr("class", "row col-sm-12")
      //   .append("h2")
      //   .text(y);
      let papers = yearRow
        .append("div")
        .attr("class", "row col-sm-12 papers overflow-auto")
        .attr("data-year", y);

      $(`#papers-row-${y} > div.papers`).on("scroll", function () {
        console.log($(this), $(this).scrollTop());
        let el = $(this);
        // if ($(this).scrollTop() >= $(this).offset().top + $('.div').
        // outerHeight() - vh) {
        if (el.scrollTop() >= el.get(0).scrollHeight - el.outerHeight()) {
          console.log("You reached the end of the DIV");

          el.find("div.load-more").click();
        }
      });
    }
  }
  drawPaperList(
    papers,
    all_max,
    results["sentenceHits"],
    results["ruleHits"],
    local_norm
  );
}
function drawPapersByFilter(results, local_norm = false) {
  let active = true;
  let active2 = true;
  if ($(`#papers-nav-tab-${results.years[0]}`).length) {
    active = !$(`#papers-nav-tab-${results.years[0]}`).hasClass("active");
    active2 = !$(`#papers-nav-tab-${results.years[0]}`).hasClass("active");
    $(`#papers-nav-tab-${results.years[0]}`).parent().remove();
    $(`#papers-nav-${results.years[0]}`).remove();
  }
  $(".paper-norm").removeClass("active");
  if (local_norm) $("#normLocal").addClass("active");
  else $("#normGlobal").addClass("active");

  paperRow = d3.select("#papers-container");

  let nav = d3.select("#papers-container-nav-tabs");

  for (let year of results.years.sort()) {
    let tab = nav
      .append("li")
      .attr("class", "nav-item")
      .append("a")
      .attr("class", "nav-link")
      .attr("id", `papers-nav-tab-${year}`)
      .attr("data-toggle", "pill")
      .attr("href", `#papers-nav-${year}`)
      .attr("role", "tab")
      .attr("aria-controls", `papers-nav-${year}`);

    if (!active) {
      tab.attr("class", "nav-link active");
      active = true;
    }
    tab.append("h2").text(year);
  }

  let navContent = d3.select("#papers-container-nav-content");

  // minimizeDivider();
  let papers = results["papers"];
  let all_max = results["max"];
  // categorize by journal then year
  if (indexToSortPapersOn == "journaltitle") {
  } else {
    // only categorize by years
    for (let y of results.years.sort()) {
      let content = navContent
        .append("div")
        .attr("class", "tab-pane fade")
        .attr("id", `papers-nav-${y}`)
        .attr("role", "tabpanel")
        .attr("aria-labelledby", `papers-nav-tab-${y}`);

      if (!active2) {
        content.attr("class", "tab-pane fade active show");
        active2 = true;
      }

      let yearRow = content
        .append("div")
        .attr("class", "row papers-row")
        .attr("id", "papers-row-" + y);
      let papers = yearRow
        .append("div")
        .attr("class", "row col-sm-12 papers overflow-auto")
        .attr("data-year", y);

      $(`#papers-row-${y} > div.papers`).on("scroll", function () {
        console.log($(this), $(this).scrollTop());
        let el = $(this);
        // if ($(this).scrollTop() >= $(this).offset().top + $('.div').
        // outerHeight() - vh) {
        if (el.scrollTop() >= el.get(0).scrollHeight - el.outerHeight()) {
          console.log("You reached the end of the DIV");

          el.find("div.load-more").click();
        }
      });
    }
  }
  drawPaperList(
    papers,
    all_max,
    results["sentenceHits"],
    results["ruleHits"],
    local_norm
  );
}

function drawPaperList(
  papers,
  all_max,
  sentenceHits,
  ruleHits,
  local_norm = false
) {
  // now draw the actual papers
  Object.keys(papers).forEach((key) => {
    let container_id = "#papers-row-" + papers[key].year;
    if (indexToSortPapersOn == "journaltitle") {
      container_id =
        "#journal-row-" +
        papers[key].journalid +
        " #papers-row-" +
        papers[key].year;
    }
    //Append a column for each paper
    let divContainer = d3
      .select(container_id + " .papers")
      .append("div")
      .attr("class", "col-xs-* partialpadding");
    //Container for paper to go into
    let svgContainer = divContainer
      .append("svg")
      .attr("class", "paper-thumbnail")
      .attr("data-rank", papers[key]["rank"])
      .attr("width", 115)
      .attr("height", 198);
    paperText[key] = [{ articleyear: 1 }];
    let activeLines = [];
    let activeLinesPercents = [];
    let lines = papers[key]["content"];
    let max = all_max;
    if (local_norm) max = papers[key].max;
    // set list of lines with different color strengths to draw
    Object.keys(lines).forEach((i) => {
      activeLines.push(lines[i] > 0);
      activeLinesPercents.push(lines[i] / max);
    });
    drawPaper(
      110,
      160,
      activeLines,
      activeLinesPercents,
      svgContainer,
      key,
      false,
      sentenceHits[key],
      ruleHits[key]
    );
  });
  // delete the load buttons from before to redraw at end of list
  $(".load-more").remove();
  // add a load more button for each category that was drawn
  d3.selectAll(".papers")
    .append("div")
    .attr("class", "col-xs-* partialpadding load-more")
    .attr("onclick", "loadMorePapers(this);")
    .append("div")
    .attr("class", "btn")
    .append("span")
    .text("...");
}

// load a small set of papers to be specifically appended after element
function loadMorePapers(elem) {
  let $papers = $(elem).closest(".papers");
  let $sibs = $(".paper-thumbnail", $papers);
  let last_rank = Math.max.apply(
    Math,
    $.map($sibs.toArray(), function (node) {
      return $(node).data("rank");
    })
  );
  let year = $papers.data("year");
  let filtered = [];
  let jid = $papers.data("journal-id");
  if (typeof jid == "undefined") jid = "";
  for (let sel of selections) {
    if (year == sel.split("-")[0]) filtered.push(sel);
  }
  paperRequests.push(
    $.ajax({
      type: "POST",
      url: processURL + "papers",
      data: JSON.stringify({
        selections: filtered,
        query: currSearchQuery,
        increment: currIncrement,
        rangeLeft: sentenceRangeAbove,
        rangeRight: sentenceRangeBelow,
        year: year,
        journalid: jid,
        lastRank: last_rank,
        nrank: nPaperLoad,
        signals: {},
      }),
      success: function (data) {
        let extra_papers = data;
        paper_data["papers"] = $.extend(
          paper_data["papers"],
          extra_papers["papers"]
        );
        if (extra_papers["max"] > paper_data["max"])
          paper_data["max"] = extra_papers["max"];
        paper_data["journals"] = $.extend(
          paper_data["journals"],
          extra_papers["journals"]
        );
        drawPaperList(
          extra_papers["papers"],
          paper_data["max"],
          extra_papers["sentenceHits"],
          extra_papers["ruleHits"]
        );
      },
      async: true,
      timeout: 600000,
    })
  );
}

//Draws all the papers
function drawPapers2() {
  //Remove old row
  d3.select("#paperRow").remove();
  //Append a row for all the papers
  paperRow = d3.select("#pills-papers").append("div").attr("class", "row");

  paperData = {};
  //Loop through all selections
  for (var i = 0; i < selections.length; i++) {
    //Split the selection into: Left Bounds, Right Bounds and Year
    var titlesSplit = selections[i].split("-");
    var year = titlesSplit[0].substring(0, titlesSplit[0].length);

    titlesSplit = titlesSplit[1].trim().split("-");
    var leftBoundary = titlesSplit[0].substring(0, titlesSplit[0].indexOf("%"));
    var rightBoundary = titlesSplit[1].substring(
      0,
      titlesSplit[1].indexOf("%")
    );

    //Loop through all results for the year
    for (var j = 0; j < yearResults[year].length; j++) {
      //If a result from that year falls under the boundaries
      if (
        yearResults[year][j][0]["percent"] * 100 >= leftBoundary &&
        yearResults[year][j][0]["percent"] * 100 <= rightBoundary
      ) {
        //If array for the paper doesnt exist, create it
        if (paperData[yearResults[year][j][0]["articleid"]] == undefined) {
          paperData[yearResults[year][j][0]["articleid"]] = [];
        }

        //The start sentence for the reference context
        var startSentence =
          yearResults[year][j][0]["citationsentence"] - sentenceRangeAbove;
        if (startSentence < 0) {
          startSentence = 0;
        }

        //Iffy fix for the sentence below being a string
        if (typeof sentenceRangeBelow == "string") {
          sentenceRangeBelow = parseInt(sentenceRangeBelow);
        }

        //The end sentence for the reference context
        var endSentence =
          yearResults[year][j][0]["citationsentence"] + sentenceRangeBelow; //CHECK - REMOVING FIXED BOUNDARY ISSUES, BUT MIGHT CAUSE ISSUES WITH PAPER BOUNDARIES //Push all relevant data about the reference to the array for the article

        /*if (boundariesByPaper[yearResults[year][j][0]['articleid']] != undefined) {
                    startSentence = yearResults[year][j][0]['citationsentence'] - boundariesByPaper[yearResults[year][j][0]['articleid']][0];
                    endSentence = yearResults[year][j][0]['citationsentence'] + boundariesByPaper[yearResults[year][j][0]['articleid']][1];
                    console.log(startSentence + " " + endSentence);
                }*/ paperData[
          yearResults[year][j][0]["articleid"]
        ].push([]);
        for (var k = 0; k < yearResults[year][j].length; k++) {
          paperData[yearResults[year][j][0]["articleid"]][
            paperData[yearResults[year][j][0]["articleid"]].length - 1
          ].push([
            yearResults[year][j][k]["percent"],
            yearResults[year][j][k]["wordstart"],
            yearResults[year][j][k]["wordend"],
            yearResults[year][j][k]["citationstart"],
            yearResults[year][j][k]["citationend"],
            yearResults[year][j][k]["citationarticletitle"],
            yearResults[year][j][k]["citationauthors"],
            yearResults[year][j][k]["citationyear"],
            startSentence,
            endSentence,
          ]);
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
      var startNeededBoundary =
        temp[paper][1][i][0][temp[paper][1][i][0].length - 2];
      var endNeededBoundary =
        temp[paper][1][i][0][temp[paper][1][i][0].length - 1];
      if (
        !neededBoundaries.includes([startNeededBoundary, endNeededBoundary])
      ) {
        //Fix - still allows copies in
        neededBoundaries.push([startNeededBoundary, endNeededBoundary]);
      }
    }

    var divContainer = paperRow
      .append("div")
      .attr("class", "col-xs-* partialpadding"); //Append a column for each paper
    var svgContainer = divContainer
      .append("svg")
      .attr("class", "paper-thumbnail")
      .attr("width", 115)
      .attr("height", 198); //Container for paper to go into

    boundariesByPaper[temp[paper][0]] = [
      sentenceRangeAbove,
      sentenceRangeBelow,
    ]; //Used so that each paper has a reference of their boundaries, so that they can change seperate of the rest

    //If the paper text hasnt been downloaded already, download it
    if (paperText[temp[paper][0]] == undefined) {
      prepPaperText(temp[paper][0], neededBoundaries, svgContainer, false);
    } else {
      console.log("using exisiting paper data");
      getPaperBoundary(temp[paper][0], neededBoundaries, svgContainer, false);
    }
  }

  //Hide the popover if a click is made outside any papers
  $("html").on("click", function (e) {
    //Did not click a popover toggle or popover
    if (
      $(e.target).data("toggle") !== "popover" &&
      $(e.target).parents(".popover").length === 0
    ) {
      $('[data-toggle="popover"]').popover("hide");
      inTextSelection = [];
      referencesSelected = [];

      var temp = $("[data-toggle=popover]");
      for (var i = 0; i < temp.length; i++) {
        drawBorder(d3.select(temp[i].parentNode).select("#paperRect"), true);
      }
    }
  });
}

//Draws a specific paper and adds popover content (references)
function drawPaper(
  sizex,
  sizey,
  activeLines,
  activeLinesPercents,
  svgContainer,
  articleid,
  display,
  sentenceHits,
  ruleHits
) {
  //Filter for dropshadows
  var filter = svgContainer
    .append("defs")
    .append("filter")
    .attr("id", `dropshadowPaper-${articleid}`)
    .attr("height", "130%");
  filter
    .append("feOffset")
    .attr("result", "offOut")
    .attr("in", "SourceGraphic")
    .attr("dx", 0)
    .attr("dy", 2);
  filter
    .append("feColorMatrix")
    .attr("result", "matrixOut")
    .attr("in", "offOut")
    .attr("type", "matrix")
    .attr("values", "0.2 0 0 0 0 0 0.2 0 0 0 0 0 0.2 0 0 0 0 0 1 0");
  filter
    .append("feGaussianBlur")
    .attr("result", "blurOut")
    .attr("in", "matrixOut")
    .attr("stdDeviation", 2);
  filter
    .append("feBlend")
    .attr("in", "SourceGraphic")
    .attr("in2", "blurOut")
    .attr("mode", "normal");

  //Rectangle for the paper
  var paperRect = svgContainer
    .append("rect")
    .attr("x", 3)
    .attr("y", 3)
    .attr("rx", 3)
    .attr("xy", 3)
    .attr("width", sizex)
    .attr("height", sizey + 20)
    .attr("id", "paperRect")
    .attr("filter", `url(#dropshadowPaper-${articleid})`)
    .style("fill", d3.rgb(248, 249, 250));

  //Calculation to figure out the max lines possible and padding needed (messy - rewrite if can)
  var lineSizeY = 3;
  var numOfLines = activeLines.length;
  var minLinePadding = (sizey - numOfLines * lineSizeY) / (numOfLines + 1);

  //Draw the lines with padding needed
  var locationXStart = 3 + sizex * 0.1;
  var locationXEnd = sizex * 0.9 + 3;
  var locationY = 4 + minLinePadding;

  for (var i = 0; i < activeLines.length; i++) {
    //Change color if they should be selected
    var color = d3.rgb(248, 249, 250);
    if (activeLines[i] == true) {
      color = colors(activeLinesPercents[i]);
    }

    var line = svgContainer
      .append("line") // attach a line
      .style("stroke", color) // colour the line
      .attr("x1", locationXStart) // x position of the first end of the line
      .attr("y1", locationY) // y position of the first end of the line
      .attr("x2", locationXEnd) // x position of the second end of the line
      .attr("y2", locationY)
      .attr("stroke-width", lineSizeY);
    locationY += minLinePadding + lineSizeY;
  }
  let uniqueCategories = {};
  for (let i = 0; i < ruleHits.length; ++i) {
    for (let j = 0; j < ruleHits[i].length; ++j) {
      uniqueCategories[ruleHits[i][j].name] = 1;
    }
  }
  uniqueCategories = Object.keys(uniqueCategories).length;
  if (uniqueCategories) {
    svgContainer
      .append("text")
      .attr("x", sizex / 2)
      .attr("y", sizey + 10)
      .attr("dy", ".35em")
      .attr("opacity", 0.7)
      .attr("font-weight", "bold")
      .text(uniqueCategories);
  }

  //Creates a filter for the little notification circle applied to the papers
  filter = svgContainer
    .append("defs")
    .append("filter")
    .attr("id", "dropshadowCircle")
    .attr("height", "130%");
  filter
    .append("feOffset")
    .attr("result", "offOut")
    .attr("in", "SourceGraphic")
    .attr("dx", 0)
    .attr("dy", 1);
  filter
    .append("feColorMatrix")
    .attr("result", "matrixOut")
    .attr("in", "offOut")
    .attr("type", "matrix")
    .attr("values", "0.1 0 0 0 0 0 0.1 0 0 0 0 0 0.1 0 0 0 0 0 1 0");
  filter
    .append("feGaussianBlur")
    .attr("result", "blurOut")
    .attr("in", "matrixOut")
    .attr("stdDeviation", 0.5);
  filter
    .append("feBlend")
    .attr("in", "SourceGraphic")
    .attr("in2", "blurOut")
    .attr("mode", "normal");

  //Draw the notification circle but don't show it
  svgContainer
    .append("rect")
    .attr("x", sizex * 0.86)
    .attr("y", sizey * 0.9)
    .attr("rx", 15)
    .attr("xy", 15)
    .attr("width", 10)
    .attr("height", 10)
    .attr("filter", "url(#dropshadowCircle)")
    .attr("id", "unfinishedCircle")
    .attr("display", "none");

  // moved popover text code to own function getPopoverContent();

  //The hitbox used to detect clicks on the entire glyph
  var squareHitBox = svgContainer
    .append("rect")
    .attr("x", 3)
    .attr("y", 3)
    .attr("rx", 3)
    .attr("xy", 3)
    .attr("width", sizex)
    .attr("height", sizey)
    .attr("data-toggle", "popover")
    .attr("id", articleid + "_" + paperText[articleid][0]["articleyear"])
    // .attr("data-content", $('#popover_content_wrapper').html()) //Set the popover content to display custom html
    .style("fill", "rgba(0,0,0,0)");

  //This is the cause of the slowdown - enables popups on all papers
  // Jay - set trigger to manual, we'll handle activations ourself
  // let $popover = $(this).popover({ html: true, container: 'body', trigger: 'manual' });

  //Allows only one popup at a time - if a popup other than the one clicked is active, it is hidden
  $(squareHitBox.node()).on("click", function (e) {
    let article_id = $(this).attr("id").split("_")[0];
    // setPopoverContent(article_id)
    getPopoverContent(article_id, sentenceHits, ruleHits);
    // enable popovers as we need them
    let $popover = $(this).popover({
      html: true,
      container: "body",
      trigger: "manual",
    });

    // clear the data whenever we hide a popover to keep our html clean
    // $(this).on("hidden.bs.popover", function(e) {
    //   d3.select(this).attr("data-content", "");
    // });
    //If the paper is clicked, hide all other papers open at the moment
    // $('[data-toggle=popover]').not(this).popover('hide');
    // d3.select(this).attr("data-content", $('#popover_content_wrapper').html());
    // $(this).popover('show');
    //Reset selection data that was not added
    inTextSelection = [];
    referencesSelected = [];

    var temp = $("[data-toggle=popover]").not(this);
    //Remove a border on all the unselected objects
    for (var i = 0; i < temp.length; i++) {
      drawBorder(d3.select(temp[i].parentNode).select("#paperRect"), true);
    }

    //If the paper was recently selected (checked by looking at the stroke on the paper), then add a stroke
    if (
      d3.select(this.parentNode).select("#paperRect").style("stroke") == "none"
    ) {
      drawBorder(d3.select(this.parentNode).select("#paperRect"), false);
      currentPaperIndicator = d3
        .select(this.parentNode)
        .select("#unfinishedCircle");
      currentPaperSelected = d3.select(this.parentNode);
    } else {
      //Else remove the stroke - the paper is being unselected
      drawBorder(d3.select(this.parentNode).select("#paperRect"), true);
      currentPaperIndicator = null;
      $(this).popover("hide");
    }
  });

  //Used to tell if the specific paper's popover should be shown immediately after creation - used when changing boundaries
  if (display == true) {
    //Simulates mouse click on the paper
    jQuery.fn.d3Click = function () {
      //Used to click the d3 object (svg)
      this.each(function (i, e) {
        var evt = new MouseEvent("click");
        e.dispatchEvent(evt);
      });
    };

    if (d3.select("#pills-papers-tab").classed("active")) {
      $(squareHitBox.node()).d3Click();
    }
  }
}

//Used to change the height of the popover in the paper view when clicking the "change boundaries" button
function cycleVisibility(item) {
  var items = [
    item.parentElement.parentElement.childNodes[9].childNodes[1],
    item.parentElement.parentElement.childNodes[11].childNodes[1],
    item.parentElement.parentElement.childNodes[13].childNodes[1],
    item.parentElement.parentElement.childNodes[15].childNodes[1],
  ];

  var mainPage = [
    item.parentElement.parentElement.parentElement.parentElement.parentElement
      .childNodes[1],
    item.parentElement.parentElement.parentElement.parentElement.parentElement
      .childNodes[10],
  ];

  var id = currentPaperSelected
    .selectAll("rect")
    .filter(function (d, i) {
      return i === 2;
    })
    .attr("id");

  if (d3.select(items[0]).style("display") == "none") {
    //unhide
    d3.select(mainPage[0]).style("height", "90px");
    d3.select(mainPage[0]).style("margin-top", "5px");
    d3.select(mainPage[1]).style("height", "335px");
    d3.select(mainPage[1]).style("margin-top", "10px");
  } else {
    //hide

    d3.select(mainPage[0]).style("height", "60px");
    d3.select(mainPage[0]).style("margin-top", "20px");
    d3.select(mainPage[1]).style("height", "365px");
    d3.select(mainPage[1]).style("margin-top", "-20px");
  }

  for (var item in items) {
    var temp = d3.select(items[item]);
    if (temp.style("display") == "none") {
      temp.style("display", null); //unhide
    } else {
      temp.style("display", "none"); // hide
    }
  }
}

function switchToPapers() {
  $("#navOptions").hide();
  $("#db-state-container").hide();
  $("#paper-filter-form").find(".title-field").attr("disabled", true);
  //Clear the previous paper requests
  clearRequests(false, true);
  //Allows the user access to the papers page once they've selected an item
  // if (document.getElementById("pills-papers-tab").classList.contains('disabled')) {
  //     document.getElementById("pills-papers-tab").classList.remove("disabled");
  // }
  if (
    last_query.currIncrement == currIncrement &&
    last_query.currSearchQuery == currSearchQuery &&
    last_query.selections == selections
  ) {
    return;
  } else {
    last_query.currIncrement = currIncrement;
    last_query.currSearchQuery = currSearchQuery;
    last_query.selections = selections;
  }
  if (selections.length == 0) {
    selectAllYears(); // default is to show all :)
  }
  d3.select("#pills-papers").selectAll(".row").remove(); //Remove all objects that might still be there

  //Remove the paper row - append a message about the slow computation time, and run the search for the papers
  d3.select("#paperRow").remove();
  var paperRow = d3
    .select("#pills-papers")
    .append("div")
    .attr("class", "row justify-content-center")
    .attr("id", "paperRow");
  paperRow
    .append("div")
    .attr("class", "alert alert-warning alert-dismissible fade show")
    .attr("role", "alert")
    .attr("id", "alert")
    .html(
      "<strong>Please Wait</strong> - the computation might take awhile. <button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>"
    );

  d3.select("#paperNormButton").style("display", null); //Unhide sort button for papers
  d3.select("#paperSortButton").style("display", null); //Unhide sort button for papers

  $("#pills-papers-tab").tab("show");
  executeAsync(function () {
    drawPapers();
  }, 500);
}

function getPopoverContent(articleid, sentenceHits, ruleHits) {
  $.ajax({
    type: "POST",
    url: "api/paper/",
    contentType: "application/json",
    data: JSON.stringify({
      paper_id: articleid,
      isPubmed: CURRENT_DATABASE.isPubmed,
    }),

    success: function (results) {
      // let data = JSON.parse(results);
      let data = results;
      let $modal = $("#generic-modal");
      $modal.addClass("full-screen");
      $(".modal-title", $modal).html("");
      $(".modal-body", $modal).html("");
      $(".modal-footer", $modal).html("");
      let popover = d3.select("#generic-modal .modal-body");
      let article_title =
        data["articletitle"] +
        " (" +
        data["articleyear"] +
        ") (" +
        articleid +
        ") (" +
        data["journaltitle"] +
        ")";
      $(".modal-title", $modal).html(article_title);
      // let popover = d3.select("#popover_text");
      // popover.html("");
      // popover.append("h2").text(article_title);

      let list = popover.append("ul").attr("class", "list-group citation-text");
      let counter = 0;
      sentenceHits.forEach((p) => {
        let full_text = "";
        let listEntry = list.append("li").attr("class", "list-group-item");
        for (let i = 0; i < ruleHits[counter].length; ++i) {
          let tmp = ruleHits[counter][i]["rules"];
          let words = [];
          //for (let j in tmp) {
          //const rule = tmp[j];
          const tmpWords = tmp.map((x) =>
            x.map((y) => {
              return y.term;
            })
          );
          words = words.concat(...new Set(tmpWords.flat()));
          //}
          full_text += `<div class='rule-glyph' onmouseenter='glyphEnter(this);' onmouseleave='glyphExit(this);' style='background-color:${ruleHits[counter][i]["color"]}' words='${words}'></div>`;
        }
        counter++;
        full_text += "<br/><div class='text-field'>";
        let text = p.join("");
        // markup search query words in this paragraph
        if (currSearchQuery.length > 0) {
          for (let query of currSearchQuery.split(" ")) {
            text = text.replace(
              new RegExp(query, "gi"),
              "<span class='query-text'> $& </span>"
            );
          }
        }
        full_text += text;
        full_text += "</div>";
        // full_text = tagCitationSentiment(articleid, full_text);
        //p.citations.forEach(c => {
        //  let citation_text = c.citationtext;
        //  if (!citations.includes(citation_text)) {
        //    full_text = full_text.replace(
        //      ' ' + citation_text + ' ',
        //      " <span class='citation'>" + citation_text + "</span> " // Have to add spaces to we replace the text correctly
        //    );
        //    // citations.push(citation_text); // TODO: decide to highlight them all, or just once
        //  }
        //});
        // use the markup text
        listEntry.html(full_text);
      });
      if ($($modal).find("#rule-div").length == 0) {
        $($modal).append("<div class='rule-div' id='rule-div'></div>");
      }
      if ($("#rule-div", $modal).find("#pills-admin").length == 0) {
        $("#rule-div", $modal).append($("#pills-admin").clone());
        $("#pills-admin").remove();
      }
      $modal.modal("show");
      $($modal).find("#pills-admin").addClass("active show");
      loadTable(
        "rule-sets-table",
        { table_name: "signalcategory" },
        true,
        transformCategoryData
      );
    },
  });
}
function glyphEnter(element) {
  let words = $(element).attr("words");
  words = words.split(",");
  let parent = $(element).parent();
  let textField = $(parent).find(".text-field");
  let text = $(textField).html();
  for (const i in words) {
    text = text.replace(
      new RegExp(" " + words[i] + " ", "gi"),
      `<span class='query-text' style='background-color:white;outline: 2px solid ${$(
        element
      ).css("background-color")}; border-radius:3px;'>$&</span>`
    );
  }
  $(textField).html(text);
}
function glyphExit(element) {
  let words = $(element).attr("words");
  words = words.split(",");
  let parent = $(element).parent();
  let textField = $(parent).find(".text-field");
  let text = $(textField).text();
  if (currSearchQuery.length > 0) {
    for (let query of currSearchQuery.split(" ")) {
      text = text.replace(
        new RegExp(query, "gi"),
        "<span class='query-text'> $& </span>"
      );
    }
  }
  $(textField).html(text);
}
function setPopoverContent(articleid) {
  //Append the relevant paper data in the popover
  // var popover = d3.select("#popover_text");
  // popover.html("");
  let curr_paper = paperText[articleid][0];
  let article_title =
    curr_paper["articletitle"] +
    " (" +
    curr_paper["articleyear"] +
    ") (" +
    articleid +
    ") (" +
    curr_paper["journaltitle"] +
    ")";
  popover.append("h2").text(article_title);

  //Append each reference context
  for (var i = 0; i < paperData[articleid].length; i++) {
    var tempText = "";

    //Append a container
    var listEntry = popover
      .append("ul")
      .attr("class", "list-group citation-text")
      .attr("id", articleid);
    //Onclick code to keep track of selected references incase they are added
    //Not standard, but works
    listEntry = listEntry
      .append("li")
      .attr("class", "list-group-item")
      .attr(
        "onclick",
        "selectPaperViewBoundary(this);updateReferencesSelected([this.id, this.innerHTML, paperText[this.id][0]['articletitle'], paperText[this.id][0]['articleyear'], paperText[this.id][0]['journaltitle'], paperText[this.id][0]['papertext'].length]);"
      );
    var lastSplitIndex = paperData[articleid][i][0][8][0]; //Index used to figure out where the paper text was last split on
    //If the context has a space at the beginning, skip it
    if (curr_paper["papertext"].charAt(lastSplitIndex) == " ") {
      lastSplitIndex += 1;
    }
    var endTextIndex = paperData[articleid][i][0][9][1]; //Index for the end of the context

    tempText += '"';

    // Mark up current search query and citations within each paragraph..
    let full_text = curr_paper["papertext"]
      .substring(lastSplitIndex, endTextIndex + 1)
      .trim();
    let citation_text = curr_paper["papertext"]
      .substring(
        paperData[articleid][i][0][3] - 1,
        paperData[articleid][i][0][4] + 1
      )
      .trim();

    // assumption: rules will never be found in citation text
    full_text = full_text.replace(
      citation_text,
      "<span class='citation'>" + citation_text + "</span>"
    );
    // do rule markup first
    full_text = tagCitationSentiment(articleid, full_text);
    // now markup search query words
    for (let query of currSearchQuery.split(" ")) {
      full_text = full_text.replace(
        new RegExp(query, "gi"),
        "<span class='query-text'>$&</span>"
      );
    }
    //********************************************************* JAY250220191

    //End the text and pad it a little
    tempText += full_text + '"';
    tempText += "<br><br><i>";

    //Add the citation information at the end in italics
    if (paperData[articleid][i][0][6] != "") {
      tempText += paperData[articleid][i][0][6] + ". "; //Author
    }
    if (paperData[articleid][i][0][5] != "") {
      tempText += paperData[articleid][i][0][5] + ". "; //Referenced Paper Name
    }
    if (paperData[articleid][i][0][7] != "") {
      tempText += paperData[articleid][i][0][7] + ". "; // Year
    }
    tempText += "</i>";
    //Set the popover's text to the data just made
    listEntry.html(tempText);
    //Append "br" for padding
    popover.append("br");
  }
  $modal.modal("show");

  $("#popover_text .list-group-item").on("click", function () {
    selectPaperViewBoundary(this);
    updateReferencesSelected([
      this.id,
      this.innerHTML,
      paperText[this.id][0]["articletitle"],
      paperText[this.id][0]["articleyear"],
      paperText[this.id][0]["journaltitle"],
      paperText[this.id][0]["papertext"].length,
    ]);
  });
}
