function Signal(id, cat_id, signal, type_id, parent_id, value=0) {
  // ensure that there are no duplicates (this.id must be unique)
  if(sentiment_signals[id]) throw "Signal " + id + " already exists!";
  this.signal = signal.trim();
  this.distance = 0;
  this.filters = [];
  this.restrictions = [];
  this.id = parseInt(id);
  this.category = parseInt(cat_id);
  this.typeid = parseInt(type_id);
  this.parentid = parseInt(parent_id);
  this.value = parseFloat(value);
}

let sentiment_signals = {}; // sentiment rules
let sentiment_categories = {}; // categories (+/-)
let scores = {}; // pre-processed scores for all docs
let score_data = {};
let signal_scores = {};
let default_color = "#bbb";

// Trigger action when the contexmenu is about to be shown
$(document).bind("mouseup", function (event) {
  // if where is clicked is not the menu, hide the menu
  if($(".custom-menu").is(":visible")) {
    if(!$(event.target).parents(".custom-menu").length > 0) {
      $(".custom-menu").hide(100);
    }
  }
  // Avoid the real one
  let sel = window.getSelection();
  if(sel.toString() != "") {
    // only show custom menu when we are highlighting in a popover
    if($(sel.getRangeAt(0).commonAncestorContainer.parentNode).parent().hasClass("citation-text")) {
      console.log("yay");
      $("#text-selection").val(sel);
      $(".custom-menu").finish().toggle(100).css({
          top: event.pageY + "px",
          left: event.pageX + "px"
      });
    }
  }
});

// given paper citation text, get matching rule counts
function tagCitationSentiment(articleid, text) {
  let new_text = text, score = 0, n = 0;
  // a tag is a json object that contains signal_idx, location ([start, end]),
  // and value (1, 0, -1)
  for(let key of Object.keys(sentiment_signals)) {
    let s = sentiment_signals[key];
    let cat = s.category;
    let color = sentiment_categories[cat].color;
    let rule = new RegExp(`(${s.signal})`, 'ig')
      , value = s.value;
    if(rule.exec(new_text)) {
      // markup the existence of this rule in the text
      new_text = new_text.replace(rule, "<span class='sentiment-text'>"
        + s.signal + "</span>");
      score += value; // sum score
      n++;
    }
  }
  // save the score (average between -1 and +1)
  if(articleid in scores) {
    scores[articleid] = (scores[articleid] + (score / n)) / 2;
  } else {
    scores[articleid] = 0;
  }
  return new_text;
}

// Pre-process the front screen counts for a single year
function processSignals(query, year, recache=1) {
  // if a request already exists, abort it and request new one
  if(process_queue[year] != undefined) process_queue[year].abort();
  // request
  process_queue[year] = $.ajax({
    type: 'POST',
    url: currentURL + "process/signals",
    data: {
      'query': JSON.stringify(query)
      , 'year': year
      , 'ruleSet': JSON.stringify(sentiment_signals) // for backprocessing
      , 'rangeLeft': sentenceRangeAbove
      , 'rangeRight': sentenceRangeBelow
      , 'recache': recache
    },
    success: function (data) {
      // done so let's remove this from the queue
      process_queue[year] = undefined;
      score_data[year] = processSentimentBins(data);;
      if(overlay_sentiment) drawSentimentColumn(year);
    },
    error: function() {
      process_queue[year] = undefined;
    },
    async: true
  });
}

// Aggregate sentiment data into bins for use in d3
function processSentimentBins(data) {
  let bin_count = 100/currIncrement
    , sorted_data = { "max_value": 0
        , "max_count": 0
        , "total_value": new Array(bin_count).fill(0).map(() => 0)
      };

  // for each category (positive/neutral/negative)
  Object.keys(sentiment_categories).forEach(k => {
    let cat_id = k.toString();
    // create an empty array of n bins for values and counts
    sorted_data[cat_id] = {
      "value": new Array(bin_count).fill(0).map(() => 0)
    }
  });

  for(let row of data) {
    let bin_num = Math.floor((row.percent*100)/currIncrement);
    // score should have all the same sentiment categories
    Object.keys(row.score).forEach(k => {
      let cat_id = k.toString();
      let val = Math.abs(row.score[cat_id]);
      sorted_data[cat_id]["value"][bin_num] += val;
      sorted_data["total_value"][bin_num] += val;
      if(sorted_data[cat_id]["value"][bin_num] > sorted_data["max_value"]) {
        sorted_data["max_value"] = sorted_data[cat_id]["value"][bin_num];
      }
    });
  }
  return sorted_data;
}

//Draw the column on the main screen
function drawSentimentColumn(year) {
  // this is okay because at this point, the column has been drawn
  let cat_list = Object.keys(sentiment_categories);
  if($(".sentiment.overlay-"+year).length > 0) return; // already drawn
  // iterate for each incremental block in this column
  for(let i=0; i<100/currIncrement; i++) {
    let $box = $("." + ([year,"minsqr","box-"+i].join(".")))
      , minsqr = d3.select("#box-group-"+year+"-"+i)
      , box_width = $box.width()
      , box_height = $box.height()
      , svgContainer = d3.select("#svg-"+year)
      , x_offset = 0
      , total_val = score_data[year]["total_value"][i];
      // no sentiment? Make it a completely neutral square
      if(total_val == 0) {
        // obviously this is temporary.. should be a default set by user (if any)
        svgContainer.append("rect")
          .attr("width", box_width)
          .attr("height", box_height)
          .attr("x", minsqr.attr("dx"))
          .attr("y", minsqr.attr("dy"))
          .attr("class", "sentiment overlay-"+year)
          .style("fill", default_color)
          .style("opacity", 0.5);
        continue;
      }
      // for each of the categories listed by user
      for(let cat of cat_list) {
        // draw a proportional square for this category/square
        if(!score_data[year][cat]) continue;
        let cat_width = (score_data[year][cat]["value"][i]/total_val) * box_width;
        x_offset += cat_width;
        let ratio = score_data[year][cat]["value"][i] / score_data[year]["max_value"];
        svgContainer.append("rect")
          .attr("width", cat_width)
          .attr("height", box_height)
          .attr("x", parseFloat(minsqr.attr("dx"))+box_width-x_offset)
          .attr("y", minsqr.attr("dy"))
          .attr("class", "sentiment overlay-"+year)
          .style("fill", sentiment_categories[cat].color)
          .style("opacity", (ratio * 0.6)+0.3);
      }
  }
  if(overlay_sentiment) {
    $(".sentiment").show();
  }
}

// load category data into json object
function transformCategoryData(results, replace_all=false) {
  if(replace_all) {
    sentiment_categories = {};
  }
  for(let cat of results) {
    sentiment_categories[cat.id] = { "name": cat.catname
      , "value": cat.score
      , "color": cat.color
    }
  }
}

// load signal data into json object
function transformSignalData(results, replace_all) {
  if(replace_all) sentiment_signals = {};
  for(let signal of results) {
    try {
      // use results to instantiate a signal object
      let s = new Signal(signal.id, signal.signalcategoryid, signal.signal
                          , signal.signaltypeid, signal.parentid, signal.score);
      sentiment_signals[signal.id] = s;
    } catch(e) {
      console.log("Error loading signal: " + e);
      continue;
    }
  }
}

function loadCategories(callback) {
  loadData("signalcategory", function(results) {
      sentiment_signals = {};
      transformCategoryData(results);
      if(typeof(callback) != "undefined") callback();
  });
}

// load all filters at nonce
function loadSignals(callback) {
  loadData("signalbytype", function(signals) {
    transformSignalData(signals);
    loadFilters();
    loadRestrictions();
    updateInterface();
    if(typeof(callback) != "undefined") callback();
  }, {"signaltypeid": 1});
}

// load all filters at nonce
function loadFilters() {
  loadData("signalbytype", function(filters) {
    for(let s of filters) {
      try {
        // use results to instantiate a signal object
        let s = new Signal(signal.id, signal.signalcategoryid, signal.signal
                            , signal.signaltypeid, signal.parentid, signal.score);
        sentiment_signals[signal.id] = s;
        if(!sentiment_signals[signal.parentid].filters.includes(signal.id)) {
          sentiment_signals[signal.parentid].filters.push(signal.id);
        }
      } catch(e) {
        console.log("Error loading signal: " + e);
        continue;
      }
    }
  }, {"signaltypeid":2});
}

// load all restrictions at once
function loadRestrictions() {
  loadData("signalbytype", function(restrictions) {
    for(let s of restrictions) {
      try {
        // use results to instantiate a signal object
        let s = new Signal(signal.id, signal.signalcategoryid, signal.signal
                            , signal.signaltypeid, signal.parentid, signal.score);
        sentiment_signals[signal.id] = s;
        if(!sentiment_signals[signal.parentid].restrictions.includes(signal.id)) {
          sentiment_signals[signal.parentid].restrictions.push(signal.id);
        }
      } catch(e) {
        console.log("Error loading signal: " + e);
        continue;
      }
    }
  }, {"signaltypeid":3});
}

// redraw all html elements
function updateInterface() {
  updateCategoryInterface();
  // drawSignalManager();
}

// redraw category elements
function updateCategoryInterface() {
  // update global html elements to reflect any changes to categories
  $("#categories").html("");
  $(".custom-menu").html("");
  Object.keys(sentiment_categories).forEach( id => {
    let cat = sentiment_categories[id];
    $("#rule-type").append(" \
      <option value='" + id + "'>" + cat.name + "</option>");

      let html = "<div class='col-sm-4'> \
        <h4>" + cat.name + "</h4> \
        <div id='" + id + "-rules' class='rule-list'> \
        </div>\
      </div>";
    $("#categories").append($(html));

    html = "<li class='menu-btn' onclick='addSignal(" + id + ");'>" + cat.name + "</li>";
    $(".custom-menu").append($(html));
  });
}

// create a generic select input of categories
function getCategorySelect() {
  let $sel = $("<select class='sel-cat'></select>")
  Object.keys(sentiment_categories).forEach( id => {
    let cat = sentiment_categories[id];
    $sel.append(" \
      <option value='" + id + "'>" + cat.name + "</option>");
  });
  return $sel;
}

// process our signals wrt our current search query
function processAllSignals() {
    $.ajax({
      type: 'POST',
      url: processURL + "process/signals",
      data: JSON.stringify({
        "increment": currIncrement
        , "loaded_articles": loaded_articles
        , "signals": sentiment_signals
        , "query": currSearchQuery
      }),
      success: function (results) {
        let data = JSON.parse(results);
        score_data = data["front_data"];
        signal_scores = data["signal_scores"];
        Object.keys(score_data).forEach(year => {
          drawSentimentColumn(year);
        });
        $("#changeLabelItem2").removeClass("disabled");
        createVisualization(transformScores());
      }
      , error: function(err) {
        console.log(err);
      }
    });
}

// filter our signal list by either a category, parentid, or both
function filterSignals(category, pid) {
  let filtered_data = sentiment_signals;
  // filter by a category
  if(typeof(category) != "undefined") {
    let acc = {};
    Object.keys(filtered_data).forEach(key => {
      if(filtered_data[key].category == category) {
        acc[key] = filtered_data[key];
      }
    });
    filtered_data = acc;
  }
  // filter by a specific parent signal
  if(typeof(pid) != "undefined") {
    // get a recursive list of children keys
    let signal = filtered_data[pid];
    let keys = getAllChildrenKeys(signal);
    let acc = {};
    keys.push(pid);
    Object.keys(filtered_data).forEach(key => {
      if(keys.includes(key)) {
        acc[key] = filtered_data[key];
      }
    });
    filtered_data = acc;
  }
  return filtered_data;
}

function getAllChildrenKeys(signal) {
  let children = signal.filters.concat(signal.restrictions);
  let keys = [];
  for(let child of children) {
    keys.push(child.id);
    keys = keys.concat(getAllChildrenKeys(child));
  }
  return keys.filter( (value, index, self) => {
    return self.indexOf(value) === index;
  });
}
