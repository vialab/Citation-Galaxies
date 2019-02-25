function Signal(signal, value=0) {
  this.signal = signal;
  this.value = value;
  this.filter_distance = 0;
  this.custom_filters = [];
  this.negation_distance = 4;
  this.restrictions = [];
}

var sentiment_signals = { "positive":[], "neutral":[], "negative":[] }; // sentiment rules
var scores = {};

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

// add a rule to our sentiment rule set
function addRule(category) {
  $(".custom-menu").hide(100);
  let text = $("#text-selection").val()
    , value = 1;
  if(category == "neutral") value = 0;
  if(category == "negative") value = -1;
  sentiment_signals[category].push(new Signal(text, value));
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
      let rule = sentiment_signals[key][i].signal
        , idx = text.indexOf(rule);
      if(idx > 0) {
        // markup the existence of this rule in the text
        new_text = new_text.replace(rule, "<span style='background-color: #"
          + color + "'>" + rule + "</span>");
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
