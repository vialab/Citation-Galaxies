import * as modal from "./modules/modal.js";

// var vw,vh;
// var vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
// var vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
let MOVE_BRUSH;
$(document).ready((x, y, z) => {
  // console.log("newfront ready: ", x, y, z, modal.mode);
  const socket = io(window.location.origin);
  socket.on("progress", (msg) => {
    onProgress(msg);
  });
  // Create global width and height variables
  vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  $("#load-existing-work").on("click", loadExistingWork);
  $("#delete-existing-work").on("click", deleteExistingWork);
  $("#snapshot-icon").on("click", snapShot);
  //check if previous work is available
  checkExistingWork();
  createTimeLine();
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
  $("#snapshot-download").on("click", submitSnapShot);
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
  //requires at least one ruleset to be selected
  if (options.ruleSets.length === 0) {
    $("#warning-message").text("At least one rule set must be selected.");
    $("#warning").modal("toggle");
    return;
  }
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
      spinIconDb(results.db);
      if (results.db) {
        if (!$("#pubmed-state").hasClass("fill")) {
          $("#pubmed-state").toggleClass("fill");
          $("#erudit-state").toggleClass("fill");
        }
      } else {
        if (!$("#erudit-state").hasClass("fill")) {
          $("#pubmed-state").toggleClass("fill");
          $("#erudit-state").toggleClass("fill");
        }
        const min = $("#timeline-selection").attr("min-year");
        const max = $("#timeline-selection").attr("max-year");
        let years = [];
        for (let i = min; i <= max; ++i) {
          years.push(i);
        }
        getOverview(years, populateTimeline);
      }
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
    catch: function (err) {
      displayError(err.message);
    },
  });
}
function deleteExistingWork() {
  $("#existing-work").modal("toggle");
  disableSearchUI(true); // disables the search UI to prevent another search while searching
  $.ajax({
    type: "POST",
    url: "/api/delete-existing-work",
    success: function (results) {
      disableSearchUI(false);
    },
    catch: function (err) {
      displayError(err.message);
    },
  });
}
async function getFilterSuggestions(currentValue, filter, element) {
  try {
    const currentYearTab = getCurrentYearTab();
    if (!currentYearTab) {
      console.error("current tab could not be found.");
      return;
    }
    let result = await $.ajax({
      url: "api/paper/filter-suggestions",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        currentValue,
        filter,
        ids: Object.keys(paper_data.papers),
        isPubmed: CURRENT_DATABASE.isPubmed,
        year: currentYearTab,
      }),
    });
    $(element).autocomplete({ source: result });
  } catch (e) {
    displayError(e.message);
  }
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
        <input type="text" class="form-control title-field" placeholder="title" ${
          !CURRENT_DATABASE.isPubmed ? "disabled" : "enabled"
        }>
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
//gets the year currently selected in the paper view page
function getCurrentYearTab() {
  const tabs = $("a[id^='papers-nav-tab-']");
  let tabId = "";
  for (const x of tabs) {
    if ($(x).hasClass("active")) {
      tabId = $(x).attr("id");
      break;
    }
  }
  if (tabId === "") {
    return null;
  }
  const splitId = tabId.split("-");
  const end = splitId.length - 1;
  return Number(splitId[end]);
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
  const currentYearTab = getCurrentYearTab();
  if (!currentYearTab) {
    console.error("Error getting current year");
    return;
  }
  let result = await $.ajax({
    url: "api/paper/filter",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      fields: formInfo,
      ids: Object.keys(paper_data.papers),
      isPubmed: CURRENT_DATABASE.isPubmed,
      year: currentYearTab,
    }),
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
  spinIconDb($(pbState).hasClass(fill));
}
function spinIconDb(isPubmed) {
  if (isPubmed) {
    $("#db-graphics").css({ transform: "rotateY(0deg)" });
    $("#search-range-indicator").css({ opacity: 1 });
    $("#search-range-indicator").css({ visibility: "visible" });
    CURRENT_DATABASE = DB.Pubmed;
    $("#timeline-svg").css({ visibility: "hidden", opacity: 0 });
    years = [];
    for (let i = 2005; i <= 2020; ++i) {
      years.push({ articleyear: i });
    }
    prepContainers(10);
  } else {
    $("#db-graphics").css({ transform: "rotateY(180deg)" });
    $("#search-range-indicator").css({ opacity: 0 });
    $("#search-range-indicator").css({ visibility: "hidden" });
    CURRENT_DATABASE = DB.Erudit;
    $("#timeline-svg").css({ visibility: "visible", opacity: 1 });
    MOVE_BRUSH([2005, 2020]);
  }
}

function createTimeLine() {
  const margin = { top: 10, right: 30, bottom: 30, left: 60 };

  // append the svg object to the body of the page
  let svg = d3
    .select("#timeline-selection")
    .append("svg")
    .attr("id", "timeline-svg")
    .attr("width", "80%")
    .attr("height", "80%")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  const svgBox = d3.select("#timeline-svg").node().getBoundingClientRect();
  const width = svgBox.width - margin.left - margin.right;
  const height = svgBox.height - margin.top - margin.bottom;
  const minYearInErudit = 1945;
  const currentYear = 2020;
  //this is necessary getting the overview data
  d3.select("#timeline-selection")
    .attr("min-year", minYearInErudit)
    .attr("max-year", currentYear);

  let x = d3
    .scaleLinear()
    .range([0, width])
    .domain([minYearInErudit, currentYear]);
  let xAxis = svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));
  const brushed = function () {
    if (d3.event.sourceEvent === null) return;
    if (d3.event.sourceEvent.type === "brush") return;
    const d0 = d3.event.selection.map(x.invert);
    d3.select(this).call(brush.move, [
      x(Math.round(d0[0])),
      x(Math.round(d0[1])),
    ]);
  };

  const brushend = async () => {
    //check if there is a keyword in the searchbox
    if ($("#searchBox").val() === "") {
      return;
    }
    let selection = d3.event.selection;
    selection = selection.map((d) => x.invert(d));
    years = [];
    for (let i = selection[0]; i <= selection[1]; ++i) {
      years.push({ articleyear: i });
    }
    const genBins = (increment) => {
      const segments = Math.floor(100 / increment);
      let result = {};
      for (let i = 0; i < segments; ++i) {
        result[i] = 0;
      }
      return result;
    };
    if (CURRENT_DATABASE.isPubmed) {
      return;
    }
    let result = await $.ajax({
      url: "api/update/grid",
      type: "GET",
      contentType: "application/json",
      data: {
        years: years.map((x) => {
          return x.articleyear;
        }),
        bins: genBins(currIncrement),
      },
    });
    prepContainers(currIncrement);
    drawAllYears(result);
    //highlight selected
    //console.log(selectionObjects);
    selectionObjects.forEach((x) => {
      const id = $(x._groups[0]).attr("id");
      const selector = `#${id}.minsqr`;
      if ($(selector).length) {
        d3.select(selector).style("stroke", "rgb(123,131,138)");
        d3.select(selector).style("stroke-width", 2);
      }
    });
  };
  let brush = d3
    .brushX() // Add the brush feature using the d3.brush function
    .extent([
      [0, 0],
      [width, height],
    ]) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
    .on("brush", brushed)
    .on("end", brushend);
  let brush_group = svg
    .append("g")
    .attr("class", "brush")
    .call(brush)
    .call(brush.move, [2005, 2020].map(x));
  MOVE_BRUSH = (pos) => {
    brush_group.call(brush.move, [x(pos[0]), x(pos[1])]);
  };
}
/**
 *
 * @param {number} val 0-100
 */
function onProgress(val) {
  const progressBarId = "progress-bar";
  $(".progress").css({ visibility: "visible", opacity: "1.0" });
  $(".progress-bar-animated").css({ width: `${val}%` });
  if (val == 100) {
    $(".progress").animate({ opacity: 0 }, 700, () => {
      $(".progress").css({ visibility: "hidden" });
      $(".progress-bar-animated").css({ width: `0%` });
    });
  }
}

async function snapShot() {
  html2canvas(document.body).then(function (canvas) {
    $("#snapshot-img").attr("src", canvas.toDataURL());
    $("#snapshot-toast").modal("toggle");
  });
}
//callback for submitting snapshots
async function submitSnapShot() {
  //filters being applied
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
  const description = $("#snapshot-description").val();
  const comments = $("#snapshot-comments").val();
  const features = $("#snapshot-featurelist").val();
  const imgData = $("#snapshot-img").attr("src");

  //grid selections on the home screen
  $.ajax({
    url: "api/snapshot",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      selection: selections,
      filters: formCollection,
      img: imgData,
      info: { description, comments, features },
    }),
  });
}
