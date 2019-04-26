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
  let $sel = getCategorySelect();
  $sel.val($("#signalcategoryid", $elem).html());
  getSimilarWords(signal, function(results) {
    let $modal = $("#generic-modal");
    $(".modal-title", $modal).html("Similar words to \"" + signal + "\" by usage");
    $(".modal-body").html("");

    let $body = $(".modal-body", $modal);
    $body.html("");

    let $tbody = $("<tbody></tbody>");
    for(let i=0; i<results.length; i++) {
      let o = results[i];
      let html = "<tr><td><div class='input-group-text'>\
        <input type='checkbox' class='similar-word' data-word='" + o.word
        + "'></div></td><td>" + o.word + "</td><td>" + (o.score*100).toFixed(2)
        + "</td><td>" + $sel[0].outerHTML + "</td></tr>";
      $tbody.append(html);
    }
    $sel.attr("id", "select-all-category");
    let $table = $(`<table class='table'>
      <thead>
        <tr>
          <th>
            <div class="input-group-text">
              <input type="checkbox" id="select-all-similar">
            </div>
          </th>
          <th>Word</th>
          <th>Similarity (%)</th>
          <th>` + $sel[0].outerHTML + `</th>
        </tr>
      </thead>
    </table>`);
    $table.append($tbody);
    $body.append($table);

    $("#select-all-similar").change(function() {
      $(".similar-word").prop("checked", this.checked);
    });

    $("#select-all-category").change(function() {
      $(".sel-cat").val($(this).val());
    })

    $(".modal-footer").html("");
    $(".modal-footer").append("<button class='btn btn-primary' \
      onclick='addSimilarSignals(1);'>Add as Signal</button>");
    $(".modal-footer").append("<button class='btn btn-primary' \
      onclick='addSimilarSignals(2);'>Add as Filter</button>");
    $(".modal-footer").append("<button class='btn btn-primary' \
      onclick='addSimilarSignals(3);'>Add as Restriction</button>");

    $modal.modal("show");
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

function addSimilarSignals(type) {
  $(".similar-word:checked").each(function() {
    let $row = $(this).closest("tr");
    let values = {
      "score": 1
      , "signalcategoryid": $(".sel-cat", $row).val()
      , "signaltypeid": type
    };
    values["signal"] = $(this).data("word");
    postInsert("signal", values, function() {
      reloadTable();
      toast("Success!", "New signal was inserted!");
    });
  });
  // :signal, :score, :signalcategoryid, true, :cookieid, :signaltypeid
}
