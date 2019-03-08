function Signal(id, cat_id, signal, value=0) {
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

$(document).ready(function() {
  $.ajax({
    type: 'GET',
    url: currentURL + "categories",
    success: function(cats) {
      for(let cat of cats) {
        sentiment_categories[cat.id] = { "name": cat.catname, "value": cat.score }
        sentiment_signals[cat.id] = [];
        $("#rule-type").append(" \
          <option value='" + cat.id + "'>" + cat.catname + "</option>");

          let html = "<div class='col-sm-4'> \
            <h4>" + sentiment_categories[cat.id].name + "</h4> \
            <div id='" + cat.id + "-rules' class='rule-list'> \
            </div>\
          </div>";
        $("#categories").append($(html));
      }

      $.ajax({
        type: 'GET',
        url: currentURL + "signals",
        success: function(rules) {
          for(let signal of rules) {
            let s = new Signal(signal.id, signal.signalcategoryid, signal.signal, signal.score);
            sentiment_signals[signal.signalcategoryid].push(s);
          }
        },
        async: true
      });

    },
    async: true
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
function processSignals(query, year) {
  process_queue.push(year);
  $.ajax({
    type: 'POST',
    url: currentURL + "process/signals",
    data: {
      'query': JSON.stringify(query)
      , 'year': year
      , 'ruleSet': JSON.stringify(sentiment_signals) // for backprocessing
      , 'rangeLeft': sentenceRangeAbove
      , 'rangeRight': sentenceRangeBelow
    },
    success: function (data) {
      // done so let's remove this from the queue
      let index = process_queue.indexOf(year);
      if(index > -1) process_queue.splice(index, 1);
      score_data[year] = processSentimentBins(data);;
    },
    async: true,
    timeout: 600000
  });
}

// Aggregate sentiment data into bins for use in d3
function processSentimentBins(data) {
  let sorted_data = { "max_value": 0, "max_count": 0 }
    , bin_count = 100/currIncrement;

  // for each category (positive/neutral/negative)
  Object.keys(sentiment_categories).forEach(k => {
    // create an empty array of n bins for values and counts
    sorted_data[k] = {"value": new Array(bin_count).fill(0)
      , "count": new Array(bin_count).fill(0)
    };
  });

  for(let row of data) {
    let bin_num = Math.floor(row.percent*10);
    // score should have all the same sentiment categories
    Object.keys(row.score).forEach(cat_id => {
      let val = Math.abs(row.score[cat_id]);
      sorted_data[cat_id]["value"][bin_num] += val;
      sorted_data[cat_id]["count"][bin_num] += row.multiscore;
      if(sorted_data[cat_id]["value"][bin_num] > sorted_data["max_value"]) {
        sorted_data["max_value"] = sorted_data[cat_id]["value"][bin_num];
      }
      if(sorted_data[cat_id]["count"][bin_num] > sorted_data["max_count"]) {
        sorted_data["max_count"] = sorted_data[cat_id]["count"][bin_num];
      }
    });
  }
  return sorted_data;
}

// override the sentiment of all references to a single paper
function overrideSentiment(value) {
   // var len = inTextSelection.length; for(var i = 0; i < len; i++){
   //   selectPaperViewBoundary(inTextSelection[0]);
   // }
   let article_id = $(this).data("id");
   scores[article_id] = value;
}
