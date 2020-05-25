// get a list of similar words
function getSimilarWords(word, callback) {
  $.ajax({
    type: "GET",
    url: processURL + "similar?word=" + word,
    success: function(results) {
      callback(JSON.parse(results));
    },
    async: true
  });
}

// find similar words using getSimilarWords
function findSimilar(elem) {
  let $elem = $(elem).parents(".edit-row");
  let signal = $("#signal", $elem).html();
  let parent_id = $elem.attr("id").split("_")[1];
  let $sel = getCategorySelect();
  let $seltype = getSignalTypeSelect();

  $sel.val($("#signalcategoryid", $elem).html());
  getSimilarWords(signal, function(results) {
    let $modal = $("#generic-modal");
    $modal.removeClass("full-screen");
    $(".modal-title", $modal).html(
      'Similar words to "' + signal + '" by usage'
    );
    $(".modal-body", $modal).html("");

    let $body = $(".modal-body", $modal);
    $body.html("");

    let $tbody = $("<tbody></tbody>");
    for (let i = 0; i < results.length; i++) {
      let o = results[i];
      let html =
        "<tr><td><div class='input-group-text'>\
        <input type='checkbox' class='similar-word' data-word='" +
        o.word +
        "'></div></td><td>" +
        o.word +
        "</td><td>" +
        (o.score * 100).toFixed(2) +
        "</td><td>" +
        $seltype[0].outerHTML +
        "</td><td>" +
        $sel[0].outerHTML +
        "</td></tr>";
      $tbody.append(html);
    }
    $sel.attr("id", "select-all-category");
    $seltype.attr("id", "select-all-type");
    let $table = $(
      `<table class='table'>
      <thead>
        <tr>
          <th>
            <div class="input-group-text">
              <input type="checkbox" id="select-all-similar">
            </div>
          </th>
          <th>Word</th>
          <th>Similarity (%)</th>
          <th>` +
        $seltype[0].outerHTML +
        `</th>
          <th>` +
        $sel[0].outerHTML +
        `</th>
        </tr>
      </thead>
    </table>`
    );
    $table.append($tbody);
    $body.append($table);

    $("#select-all-similar").change(function() {
      $(".similar-word").prop("checked", this.checked);
    });

    $("#select-all-category").change(function() {
      $(".sel-cat").val($(this).val());
    });

    $("#select-all-type").change(function() {
      if ($(this).val() > 1) $(".sel-cat").hide();
      else $(".sel-cat").show();
      $(".sel-type").val($(this).val());
    });

    $(".sel-type:not(#select-all-type)").change(function() {
      let $row = $(this).parents("tr");
      if ($(this).val() > 1) $(".sel-cat", $row).hide();
      else $(".sel-cat", $row).show();
    });

    $(".modal-footer", $modal).html("");
    $(".modal-footer", $modal).append(
      "<button class='btn btn-primary' \
      onclick='addSimilarSignals(" +
        parent_id +
        ");'>Add Rules</button>"
    );

    $modal.modal("show");
  });
}

// get a list of similar words
function getPrediction(word, callback) {
  $.ajax({
    type: "GET",
    url: processURL + "predict?context=" + word,
    success: function(results) {
      callback(results);
    },
    async: true
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

function addSimilarSignals(parent_id) {
  $(".similar-word:checked").each(function() {
    let $row = $(this).parents("tr");
    let type = parseInt($(".sel-type", $row).val());
    let values = {
      score: null,
      signalcategoryid: parseInt($(".sel-cat", $row).val()),
      signaltypeid: type,
      parentid: null
    };
    if (type > 1) {
      values["parentid"] = parent_id;
      values["signalcategoryid"] = sentiment_signals[parent_id].category;
    }
    values["signal"] = $(this).data("word");
    postInsert("signal", values, function() {
      reloadTable();
      toast("Success!", "New signal was inserted!");
    });
  });
  // :signal, :score, :signalcategoryid, true, :cookieid, :signaltypeid
}
