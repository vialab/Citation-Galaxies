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
      $("#navOptions").hide();
      $("#db-state-container").hide();
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
  $("#paper-filter-form-submit-btn").on("click", submitFilters);
  $("#db-state-container").on("click", dbOnClick);
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
  $(".exit-button").on("click", function () {
    removeFilter(this);
  });
}
async function exportPage() {
  //clear the page
  clearCrudTable();
  $("#navOptions").hide();
  $("#db-state-container").hide();
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
    data: { currentValue, filter, ids: Object.keys(paper_data.papers) },
  });
  $(element).autocomplete({ source: result });
}

function addRowToFilterForm() {
  $("#paper-filter-form").prepend(
    `<div class="form-row">
    <div class="col">
    <div class="exit-button">x</div>
      <div class="form-group">
        <label for="journal-field">Journal</label>
        <input type="text" class="form-control journal-field" placeholder="journal">
      </div>
      <div class="form-group">
        <label for="title-field">Title</label>
        <input type="text" class="form-control title-field" placeholder="title">
      </div>
      <div class="form-group">
        <label for="authors-field">Author</label>
        <input type="text" class="form-control authors-field" placeholder="author">
      </div>
      <div class="form-group">
        <label for="affiliation-field">Affiliation</label>
        <input type="text" class="form-control affiliation-field" placeholder="affiliation">
      </div>
    </div>
  </div>`
  );
  setupFilterSuggestions();
}
function removeFilter(element) {
  $(element).parent().parent().remove();
}
function addIfExists(obj, key, val) {
  if (val === "") {
    return;
  }
  obj[key] = val;
}
function submitFilters() {
  $("#paper-filter-form-submit-btn").attr("disabled", true);
  //paper filter form id
  const filterFormID = "#paper-filter-form";
  //get all rows in the form
  const formRows = $(filterFormID).find(".form-row");
  //all the current field classes, add additional fields in this object
  const formFields = {
    journal: ".journal-field",
    title: ".title-field",
    author: ".authors-field",
    affiliation: ".affiliation-field",
  };
  let formCollection = [];
  //loop through each row and select the required fields
  for (let i = 0; i < formRows.length; ++i) {
    let formSchema = {};
    addIfExists(
      formSchema,
      "journal",
      $(formRows[i]).find(formFields.journal)[0].value
    );
    addIfExists(
      formSchema,
      "title",
      $(formRows[i]).find(formFields.title)[0].value
    );
    addIfExists(
      formSchema,
      "author",
      $(formRows[i]).find(formFields.author)[0].value
    );
    addIfExists(
      formSchema,
      "affiliation",
      $(formRows[i]).find(formFields.affiliation)[0].value
    );
    if (Object.keys(formSchema).length) {
      formCollection.push(formSchema);
    }
  }
  getFilteredPapers(formCollection, applyFilters);
}
function applyFilters(ids) {
  let filtered_paper_data = { papers: {}, ruleHits: {}, sentenceHits: {} };
  filtered_paper_data.max = paper_data.max;
  for (let i = 0; i < ids.length; ++i) {
    const id = ids[i];
    filtered_paper_data.papers[id + "_f"] = paper_data.papers[id];
    filtered_paper_data.papers[id + "_f"].year = "Filter";
    filtered_paper_data.ruleHits[id + "_f"] = paper_data.ruleHits[id];
    filtered_paper_data.sentenceHits[id + "_f"] = paper_data.sentenceHits[id];
  }
  filtered_paper_data.years = ["Filter"];
  drawPapersByFilter(filtered_paper_data);
}

async function getFilteredPapers(formInfo, callback) {
  let result = await $.ajax({
    url: "api/paper/filter",
    type: "GET",
    contentType: "application/json",
    data: { fields: formInfo, ids: Object.keys(paper_data.papers) },
  });
  $("#paper-filter-form-submit-btn").attr("disabled", false);
  callback(result);
}

function dbOnClick(element) {
  const pbState = "#pubmed-state";
  const erState = "#erudit-state";
  const fill = "fill";
  $(pbState).toggleClass(fill);
  $(erState).toggleClass(fill);
  // $("#db-graphics-container").css({ transform: "rotateY(180deg)" });
  if ($(pbState).hasClass(fill)) {
    $("#db-graphics").css({ transform: "rotateY(0deg)" });
    $("#search-range-indicator").css({ opacity: 1 });
    $("#search-range-indicator").css({ visibility: "visible" });
    CURRENT_DATABASE = DB.Pubmed;
  } else {
    $("#db-graphics").css({ transform: "rotateY(180deg)" });
    $("#search-range-indicator").css({ opacity: 0 });
    $("#search-range-indicator").css({ visibility: "hidden" });
    CURRENT_DATABASE = DB.Erudit;
  }
}
/**
 * This function is the entry point for when the database switches
 */
function setupDataBase() {}
