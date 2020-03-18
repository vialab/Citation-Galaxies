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
    let $elem = $("<div class='vis-category'></div>"),
      row = sentiment_categories[cat_id];
    $elem.css("background-color", row.color);
    $elem.attr("onclick", "drawSignalList(" + cat_id + ");");
    $elem.append("<h2>" + row.name + "</h2>");
    $container.append($elem);
  });
}

// draw stuff in the vis-signal container
function drawSignalList(cat_id) {
  let $container = $("#signal-list"),
    category = sentiment_categories[cat_id];
  // show the appropriate list
  $("#category-list").hide();
  $("#signal-vis").hide();
  $("#signal-list").show();
  // clear and add any applicable crumbs
  $("#crumb-list .crumb:gt(0)").remove();
  $("#crumb-list .crumb").removeClass("active");
  $("#crumb-list").append(
    "<li class='crumb active' onclick='drawSignalList(" +
      cat_id +
      ")'><span>" +
      category.name +
      "</span></li>"
  );
  // clear the container
  $container.html("");
  $container.css("background-color", hexToRgba(category.color, 0.5));
  Object.keys(sentiment_signals).forEach(key => {
    let row = sentiment_signals[key];
    if (row.category != cat_id) return;
    let $elem = $("<div class='vis-signal'></div>");
    $elem.css("background-color", category.color);
    $elem.append("<h2>" + row.signal + "</h2>");
    $elem.attr("onclick", "drawSignalVis(" + row.id + ");");
    $container.append($elem);
  });
}

// draw a vis for a specific signal
function drawSignalVis(id) {
  let signal = sentiment_signals[id],
    $container = $("#signal-vis"),
    category = sentiment_categories[signal.category];
  // show the appropriate list
  $("#category-list").hide();
  $("#signal-list").hide();
  $("#signal-vis").show();
  // clear and add any applicable crumbs
  $("#crumb-list .crumb:gt(1)").remove();
  $("#crumb-list .crumb").removeClass("active");
  $("#crumb-list").append(
    "<li class='crumb active' onclick='drawSignalVis(" +
      id +
      ")'><span>" +
      signal.signal +
      "</span></li>"
  );
  // clear the container
  $container.html("");
  $container.css("background-color", category.color);
  $container.append("<h2>" + signal.signal + "</h2>");
}

// convert some hex to rgb
// NOTE: NEED TO MAKE SURE ALL COLORS SAVED FOR CATEGORIES ARE IN HEX
function hexToRgba(hex, alpha) {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  let rgb = result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
  if (!rgb) return hex;
  return "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + alpha + ")";
}
