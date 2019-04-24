// get a list of similar words
function getSimilarWords(word, callback) {
  $.ajax({
    type: "GET"
    , url: processURL + "similar?word=" + word
    , success: function(results) {
      callback(results);
    }
    , async: true
  });
}

// find similar words using getSimilarWords
function findSimilar(elem) {
  let $elem = $(elem).parent();
  let signal = $("#signal", $elem).html();
  getSimilarWords(signal, function(results) {
    console.log(results);
    $("#generic-modal").modal("show");
  });
}

// get a list of similar words
function getPrediction(word, callback) {
  $.ajax({
    type: "GET"
    , url: processURL + "predict?context=" + word
    , success: function(results) {
      callback(results);
    }
    , async: true
  });
}

// predict output words given a context using getPrediction
function findPrediction(elem) {
  let $elem = $(elem).parent();
  let signal = $("#signal", $elem).html();
  getPrediction(signal, function(results) {
    console.log(results);
  });
}
