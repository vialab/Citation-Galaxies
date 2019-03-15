function Signal(id, cat_id, signal, value=0) {
  // ensure this category exists
  if(!sentiment_categories[cat_id]) throw "Category " + cat_id + " does not exist!";
  // ensure that there are no duplicates (this.id must be unique)
  for(let s of sentiment_signals[cat_id]) {
    if(id == s.id) throw "Signal " + id + " already exists!";
  }
  this.signal = signal.trim();
  this.value = value;
  this.filter_distance = 0;
  this.custom_filters = [];
  this.negation_distance = 4;
  this.restrictions = [];
  this.id = id;
  this.category = cat_id;
}

let sentiment_signals = {}; // sentiment rules
let sentiment_categories = {}; // categories (+/-)
let scores = {}; // pre-processed scores for all docs
let score_data = {};
let default_color = "#bbb";

$(document).ready(function() {
  loadData("categories", function(results) {
      sentiment_signals = {};
      transformCategoryData(results);
      loadData("signals", function(signals) {
        transformSignalData(signals);
        updateInterface();
      });
  });
  $("#pills-rules-tab").on("click", drawRules);
});

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
    if($(sel.getRangeAt(0).commonAncestorContainer.parentNode).parents(".popover").length) {
      $("#text-selection").val(sel);
      $(".custom-menu").finish().toggle(100).css({
          top: event.pageY + "px",
          left: event.pageX + "px"
      });
    }
  }
});

// draw list of rules on rules page
function drawRules() {
  $("#text-selection").val("");
  $(".rule-list").html("");
  for(let key of Object.keys(sentiment_signals)) {
    let $list = $("#"+key+"-rules");
    $list.append("<ul/>");
    for(let i=0; i<sentiment_signals[key].length; i++) {
      $("ul",$list).append($("<li>" + sentiment_signals[key][i].signal
        + "  <button id='" + key + "-" + i + "' class='close del-rule-btn' \
        onclick='removeSignal(this);'>&times;</button></li>"));
    }
  }
}

// add a rule to our sentiment rule set
function addSignal(category_id, draw_rules=false) {
  $(".custom-menu").hide(100);

  let text = $("#text-selection").val().trim().replace(/<(?:.|\n)*?>/gm, '')
    , value = sentiment_categories[category_id].value;

  if(text == "") return;

  $.ajax({
    type: 'POST',
    url: currentURL + "addsignal",
    data: { 'text': text
      , 'value': value
      , 'category_id': category_id
    },
    success: function (data) {
      sentiment_signals[category_id].push(new Signal(data[0].id, category_id, text, value));
      toast("Rule Added", text + " (" + sentiment_categories[category_id].name + ")");
      // reprocess sentiment scores for all of the years
      for(let year of years) {
        processSignals(currSearchQuery, year);
      }
      if(draw_rules) drawRules();
    },
    async: true
  }, 1000);
}

// delete a rule
function removeSignal(elem) {
  let idx = $(elem).attr("id").split("-")
  , rules = sentiment_signals[idx[0]][idx[1]];

  $.ajax({
    type: 'POST',
    url: currentURL + "removesignal",
    data: { 'signal_id': rules.id },
    success: function (data) {
      toast("Rule Removed", rules.signal + " ("
        + sentiment_categories[rules.category].name + ")");
      sentiment_signals[idx[0]].splice(idx[1], 1);
      drawRules();
    }
  });
}

// given paper citation text, get matching rule counts
function tagCitationSentiment(articleid, text) {
  let new_text = text, score = 0, n = 0;
  // a tag is a json object that contains signal_idx, location ([start, end]),
  // and value (1, 0, -1)
  for(let key of Object.keys(sentiment_signals)) {
    let color = "42f465";
    if(key == "neutral") color = "dbdbdb";
    if(key == "negative") color = "ffd6d6";
    for(let i=0; i<sentiment_signals[key].length; i++) {
      let rule = new RegExp(`(${sentiment_signals[key][i].signal})`, 'ig')
        , value = sentiment_signals[key][i].value;
      if(rule.exec(new_text)) {
        // markup the existence of this rule in the text
        new_text = new_text.replace(rule, "<span class='sentiment " + key
          + "'>$1</span>");
        score += value; // sum score
        n++;
      }
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
function processSignals(query, year, recache=0) {
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
      if(currentLabel == 2) drawSentimentColumn(year);
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

  // iterate for each incremental block in this column
  for(let i=0; i<100/currIncrement; i++) {
    let $box = $("." + ([year,"minsqr","box-"+i].join(".")))
      , minsqr = d3.select($box[0])
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
          .attr("x", minsqr.attr("x"))
          .attr("y", minsqr.attr("y"))
          .attr("class", "sentiment")
          .style("fill", default_color)
          .style("opacity", 0.5);
        continue;
      }
      // for each of the categories listed by user
      for(let cat of cat_list) {
        // draw a proportional square for this category/square
        let cat_width = (score_data[year][cat]["value"][i]/total_val) * box_width;
        x_offset += cat_width;
        svgContainer.append("rect")
          .attr("width", cat_width)
          .attr("height", box_height)
          .attr("x", parseFloat(minsqr.attr("x"))+box_width-x_offset)
          .attr("y", minsqr.attr("y"))
          .attr("class", "sentiment")
          .style("fill", sentiment_categories[cat].color)
          .style("opacity", (filteredYearPercents[year][1][i] * 0.6)+0.3);
      }
  }
  if(currentLabel == 2) {
    $(".sentiment").show();
  }
}


// override the sentiment of all references to a single paper [UNUSED]
function overrideSentiment(value) {
   // var len = inTextSelection.length; for(var i = 0; i < len; i++){
   //   selectPaperViewBoundary(inTextSelection[0]);
   // }
   let article_id = $(this).data("id");
   scores[article_id] = value;
}

// master update of sentiment rules.. pulls categories and signals
// as well as populates anything using Either
function updateSentimentRules(callback) {
  sentiment_categories = {};
  sentiment_signals = {};

  // any errors would result into no updates on the interface
}

// query for some data
function loadData(url, callback, _async=true) {
  // first get the categories
  $.ajax({
    type: 'GET',
    url: currentURL + url,
    success: function(results) {
      callback(results);
    },
    async: _async
  });
}

// load category data into json object
function transformCategoryData(results) {
  for(let cat of results) {
    sentiment_categories[cat.id] = { "name": cat.catname
      , "value": cat.score
      , "color": cat.color
    }
    sentiment_signals[cat.id] = [];
  }
}

// load signal data into json object
function transformSignalData(results) {
  for(let signal of results) {
    let s = new Signal(signal.id, signal.signalcategoryid, signal.signal, signal.score);
    sentiment_signals[signal.signalcategoryid].push(s);
  }
}

// redraw all html elements
function updateInterface() {
  updateCategoryInterface();
  updateSignalInterface();
}

// redraw category elements
function updateCategoryInterface() {
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

// redraw signal elements
function updateSignalInterface() {
    // nothing to do here yet
}
