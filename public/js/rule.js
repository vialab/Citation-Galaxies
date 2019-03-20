// draw the list of categories
function drawCategoryList() {
  let $container = $("#category-list");
  // show the appropriate list
  $("#signal-list").hide();
  $("#signal-vis").hide();
  $("#category-list").show();
  // clear any applicable crumbs
  $("#crumb-list .crumb:gt(0)").remove();
  // clear the container
  $container.html("");
  Object.keys(sentiment_categories).forEach(cat_id => {
    let $elem = $("<div class='vis-category'></div>")
      , row = sentiment_categories[cat_id];
    $elem.css("background-color", row.color);
    $elem.attr("onclick", "drawSignalList(" + cat_id + ");");
    $elem.append("<h2>" + row.name + "</h2>");
    $container.append($elem);
  });
}

// draw stuff in the vis-signal container
function drawSignalList(cat_id) {
  let $container = $("#signal-list")
    , category = sentiment_categories[cat_id];
  // show the appropriate list
  $("#category-list").hide();
  $("#signal-vis").hide();
  $("#signal-list").show();
  // clear and add any applicable crumbs
  $("#crumb-list .crumb:gt(0)").remove();
  $("#crumb-list .crumb").removeClass("active");
  $("#crumb-list").append("<li class='crumb active' onclick='drawSignalList("
    + cat_id + ")'>"+category.name+"</li>");
  // clear the container
  $container.html("");
  $container.css("background-color", category.color);
  sentiment_signals[cat_id].forEach((row,i) => {
    let $elem = $("<div class='vis-signal'></div>");
    $elem.append("<h2>" + row.signal + "</h2>");
    $elem.attr("onclick", "drawSignalVis(" + cat_id + ", " + i + ");");
    $container.append($elem);
  });
}

// draw a vis for a specific signal
function drawSignalVis(cat_id, sig_idx) {
  let $container = $("#signal-list")
    , category = sentiment_categories[cat_id]
    , signal = sentiment_signals[cat_id][sig_idx];
  // show the appropriate list
  $("#category-list").hide();
  $("#signal-vis").hide();
  $("#signal-list").show();
  // clear and add any applicable crumbs
  $("#crumb-list .crumb:gt(1)").remove();
  $("#crumb-list .crumb").removeClass("active");
  $("#crumb-list").append("<li class='crumb active' onclick='drawSignalVis("
    + cat_id + ", " + sig_idx + ")'>"+signal.signal+"</li>");
  // clear the container
  $container.html("");
  $container.css("background-color", category.color);
  $container.append("<h2>" + signal.signal + "</h2>");
}
