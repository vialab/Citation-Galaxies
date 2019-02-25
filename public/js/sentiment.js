function Signal(signal) {
  this.signal = signal;
  this.filter_distance = 0;
  this.custom_filters = [];
  this.negation_distance = 4;
  this.restrictions = [];
}

var sentiment_signals = { "positive":[], "neutral":[], "negative":[] }; // sentiment rules


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
  if(sel.toString() == "") {

  } else {
    $("#text-selection").val(sel);
    $(".custom-menu").finish().toggle(100).css({
        top: event.pageY + "px",
        left: event.pageX + "px"
    });
  }
});

// add a rule to our sentiment rule set
function addRule(category) {
  $(".custom-menu").hide(100);
  let text = $("#text-selection").val();
  sentiment_signals[category].push(new Signal(text));
}

// given paper citation text, get matching rule counts
function tagCitationSentiment(text) {
  let tags = [];
  // a tag is a json object that contains signal_idx, location ([start, end]),
  // and value (1, 0, -1)
  for(let key of Object.keys(sentiment_signals)) {
    let value = 1;
    if(key == "neutral") value = 0;
    if(key == "negative") value = -1;

    for(let i=0; i<sentiment_signals[key].length; i++) {
      let rule = sentiment_signals[key][i].signal
        , idx = text.indexOf(rule);
      if(idx > 0) {
        let tag = {
          "signal_idx": i
          , "location": [idx, idx+rule.length]
          , "value": value
        }
        tags.push(tag);
      }
    }

  }
  return tags;
}
