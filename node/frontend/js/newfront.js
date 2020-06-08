import * as modal from "./modules/modal.js";

// var vw,vh;
// var vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
// var vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

$(document).ready((x, y, z) => {
  console.log("newfront ready: ", x, y, z, modal.mode);

  // Create global width and height variables
  vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  $("#load-existing-work").on("click", loadExistingWork);
  //check if previous work is available
  checkExistingWork();
});

$(window).on("load", function () {
  console.log("newfront load");

  // Load the year range (hooks into old code)
  getYears((_) => {
    // Call old loading function
    getFilteredYears("", true, undefined, false, true);
  });

  setupEventHandlers();
});

function setupEventHandlers() {
  // Rules-Tab onclick
  let rulesBut = $("#pills-admin-tab");
  rulesBut.on("click", (event) => {
    if (currSearchQuery.length == 0) {
      modal.warning(
        "Cannot Edit Rules",
        "Please execute a search query before modifying rules."
      );

      // Prevent the tab from showing it's content
      event.preventDefault();
      return false;
    } else {
      if ($("#pills-tabContent").find("#pills-admin").length == 0) {
        const clone = $("#pills-admin").clone();
        $("#pills-admin").remove();
        $("#pills-tabContent").append(clone);
      }
      loadTable("rules-table", undefined, true, transformCategoryData);
    }
  });
}

// Implement some baseclass functions to make live easier elsewhere
String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};
d3.selection.prototype.first = function () {
  return d3.select(this.nodes()[0]);
};
d3.selection.prototype.last = function () {
  return d3.select(this.nodes()[this.size() - 1]);
};

function checkExistingWork() {
  $.ajax({
    type: "GET",
    url: "/api/existing-work",
    success: displayExistingWorkOption,
  });
}

function displayExistingWorkOption(result) {
  console.log(result);
  if (!result) {
    return;
  }
  $("#existing-work").modal("toggle");
}

function loadExistingWork() {
  $("#existing-work").modal("toggle");
  disableSearchUI(true); // disables the search UI to prevent another search while searching
  $.ajax({
    type: "GET",
    url: "/api/get-existing-work",
    success: function (results) {
      let data = results.result;
      const max = Number($("#rangeBefore").attr("max"));
      $("#rangeBefore").val(max - results.info.range_left);
      $("#rangeAfter").val(results.info.range_right);
      $("#searchBox").val(results.info.term);
      $("#citationRange")
        .find("#left-range")
        .text("[ " + results.info.range_left + " ");
      $("#citationRange")
        .find("#right-range")
        .text(" " + results.info.range_right + " ]");
      currSearchQuery = results.info.term;
      // loaded_articles = data["nunique"];
      disableSearchUI(false);
      drawAllYears(data);
    },
  });
}
