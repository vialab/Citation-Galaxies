import * as modal from "./modules/modal.js";

// var vw,vh;
// var vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
// var vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

$(document).ready((x, y, z) => {
  // console.log("newfront ready: ", x, y, z, modal.mode);

  // Create global width and height variables
  vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  $("#load-existing-work").on("click", loadExistingWork);
  //check if previous work is available
  checkExistingWork();
});

$(window).on("load", function () {
  //console.log("newfront load");

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
      loadTable(
        "rule-sets-table",
        { table_name: "signalcategory" },
        true,
        transformCategoryData
      );
    }
  });
  let exportBtn = $("#pills-export-tab");
  exportBtn.on("click", (event) => {
    if ($("#pills-tabContent").find("#pills-export").length == 0) {
      const clone = $("#pills-export");
      $("#pills-export").remove();
      $("#pills-tabContent").append(clone);
    }
    exportPage();
  });
  $("#json-toggle").on("click", () => {
    $("#delimiter-field").hide();
  });
  $("#csv-toggle").on("click", () => {
    $("#delimiter-field").show();
  });
  $("#export-data-form").submit(exportData);
  setupFilterSuggestions();
  $("#paper-form-add-row").on("click", addRowToFilterForm);
}
function setupFilterSuggestions() {
  $(".authors-field").on("input", function () {
    getFilterSuggestions($(this).val(), "AUTHORS", this);
  });
  $(".affiliation-field").on("input", function () {
    getFilterSuggestions($(this).val(), "AFFILIATION", this);
  });
  $(".title-field").on("input", function () {
    getFilterSuggestions($(this).val(), "TITLE", this);
  });
  $(".journal-field").on("input", function () {
    getFilterSuggestions($(this).val(), "JOURNAL", this);
  });
}
async function exportPage() {
  //clear the page
  clearCrudTable();
  $("#navOptions").hide();
  d3.select("#pills-papers").selectAll(".row").remove(); //Remove all objects that might still be there

  //Remove the paper row - append a message about the slow computation time, and run the search for the papers
  d3.select("#paperRow").remove();
  $("#export-rules-content").empty();
  await loadRules();
}

async function loadRules() {
  try {
    let result = await $.ajax({
      url: "api/rule-sets-table",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({ values: { table_name: "signalcategory" } }),
    });
    //add rule to ui
    for (let i = 0; i < result.data.length; ++i) {
      $("#export-rules-content").append(`
      <div>
        <label>
          <input type="checkbox" data-toggle="toggle" rule-id=${result.data[i].id}>
        </label>
        <div style="display:inline-block;">
        ${result.data[i].name}
        </div>
        <div style="background-color:${result.data[i].color}; display:inline-block;">
          ${result.data[i].color}
        </div>
      </div>
      `);
    }
  } catch (error) {
    console.error(error);
  }
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

function checkExportOptions() {
  let result = { isJSON: true, dataOptions: {}, meta: {}, ruleSets: [] };
  let $inputs = $("#export-data-form input:checkbox");
  $inputs.each(function () {
    //if checked add it to the json options
    if ($(this).is(":checked")) {
      if ($(this).attr("group") != undefined) {
        result[$(this).attr("group")][this.name] = $(this).val();
      }
    }
  });
  //check format
  result.isJSON = $("#json-toggle").hasClass("active");
  if (!result.isJSON) {
    result.delimiter = $("#delimiter-field").val();
  }
  //loop through and check rulesets
  let $rules = $("#export-rules-content input:checkbox");
  $rules.each(function () {
    if ($(this).is(":checked")) {
      result.ruleSets.push($(this).attr("rule-id"));
    }
  });
  return result;
}

function exportData(event) {
  event.preventDefault();
  let options = checkExportOptions();
  let url = new URL("https://localhost:4000/api/export");
  url.searchParams.append("query", JSON.stringify(options));
  window.open(url.toString());
}
function displayExistingWorkOption(result) {
  //console.log(result);
  if (!result.exists) {
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
      sentenceRangeAbove = results.info.range_left;
      sentenceRangeBelow = results.info.range_right;
      // loaded_articles = data["nunique"];
      disableSearchUI(false);
      drawAllYears(data);
    },
  });
}

async function getFilterSuggestions(currentValue, filter, element) {
  let result = await $.ajax({
    url: "api/paper/filter-suggestions",
    type: "GET",
    contentType: "application/json",
    data: { currentValue, filter },
  });
  $(element).autocomplete({ source: result });
}

function addRowToFilterForm() {
  $("#paper-filter-form").prepend(
    `<div class="form-row">
    <div class="col">
      <div class="form-group">
        <label for="journal-field">Journal</label>
        <input type="text" class="form-control journal-field" placeholder="journal">
      </div>
    </div>
    <div class="col">
      <div class="form-group">
        <label for="title-field">Title</label>
        <input type="text" class="form-control title-field" placeholder="title">
      </div>
    </div>
    <div class="col">
      <div class="form-group">
        <label for="authors-field">Author</label>
        <input type="text" class="form-control authors-field" placeholder="author">
      </div>
    </div>
    <div class="col">
      <div class="form-group">
        <label for="affiliation-field">Affiliation</label>
        <input type="text" class="form-control affiliation-field" placeholder="affiliation">
      </div>
    </div>
  </div>`
  );
  setupFilterSuggestions();
}
