var last_load = {};
var loaded_table = "";
var loaded_parent = { id: undefined, col: undefined };
var global_aliases;

$(document).ready(function () {
  /* CRUD processes are not based on search, although a nice touch would be
    having the ability to filter the results
     */

  $(document).mouseup(function (e) {
    // not editing, so we don't need to do anything
    if ($(".edit-row.editing").length == 0) return;
    if (!$(e.target).parents(".edit-row").hasClass("editing")) {
      deselectCrudRows(false);
    }
  });
});

// query for some data
function loadData(url, callback, params = {}, _async = true) {
  // first get the categories
  $.ajax({
    type: "POST",
    url: currentURL + "api/" + url,
    data: JSON.stringify({
      values: params,
    }),
    contentType: "application/json",
    success: function (results) {
      // console.log(results);
      callback(
        results["data"],
        results["aliases"],
        results["links"],
        results["actions"],
        results["name"],
        results["schema"],
        results["parent"]
      );
    },
    async: _async,
  });
}

// clear the form and clear the table of any results
function clearCrudTable() {
  let table = $("#ruleTable");
  table.children().remove();
}

// dynamically load data from a query and show results in a table
function loadTable(
  table_name,
  params,
  draw_table = true,
  callback = undefined,
  new_load = true
) {
  if (typeof params == "string") params = JSON.parse(params);
  loadData(
    table_name,
    function (results, aliases, links, actions, name, schema, parent) {
      if (typeof callback != "undefined") callback(results);
      if (draw_table) {
        clearCrudTable();
        loaded_table = table_name;
        loaded_parent = parent;
        $("#rule-table-title").html(getTableTitle(table_name));
        let external_data = {};
        // load any external data requirements for aliases
        if (
          !(
            Object.entries(aliases).length === 0 &&
            aliases.constructor === Object
          )
        ) {
          let wait_queue = [];
          // create a list of data loading calls to queue up
          Object.keys(aliases).forEach((key) => {
            if (aliases[key].query !== undefined) {
              let table_name = aliases[key].query;
              let f = () =>
                $.ajax({
                  type: "POST",
                  url: currentURL + "api/" + table_name,
                  data: JSON.stringify({ values: {} }),
                  success: (results) => {
                    external_data[table_name] = results;
                  },
                });
              // push ajax function into our queue
              wait_queue.push(f());
            }
          });
          // if we have things to load, load them synchronously
          if (wait_queue.length > 0) {
            let waiting = true,
              wait = 0;
            $.when(...wait_queue).done(function () {
              populateTable(
                results,
                name,
                $("#ruleTable"),
                links,
                actions,
                schema,
                external_data,
                aliases
              );
            });
          } else {
            populateTable(
              results,
              name,
              $("#ruleTable"),
              links,
              actions,
              schema,
              external_data,
              aliases
            );
          }
        } else {
          populateTable(
            results,
            name,
            $("#ruleTable"),
            links,
            actions,
            schema,
            external_data,
            aliases
          );
        }
      }

      if (new_load) {
        last_load = {
          table_name: table_name,
          params: params,
          draw_table: draw_table,
          callback: callback,
          timestamp: new Date().getTime(),
          title: getTableTitle(table_name),
          root: last_load,
        };
      } else {
        last_load = last_load.root;
      }
      if (Object.entries(last_load.root).length > 0) {
        $("#last-table-title").html("< " + last_load.root.title);
      } else {
        $("#last-table-title").html("");
      }
    },
    params
  );
}

function populateTable(
  signals,
  name,
  table,
  links,
  actions,
  schema,
  external_data,
  aliases
) {
  // Create the header row
  let tableHeader = $("<thead></thead>").appendTo(table);
  tableHeader.addClass("table-active");
  let tableBody = $("<tbody></tbody>").appendTo(table);
  let headerRow = $("<tr></tr>").appendTo(tableHeader);

  // Create a array to hold the keys from the json
  // To be used as the header to the table
  let headers = [];
  let header_example = signals[0];
  if (signals.length == 0) header_example = schema;

  // Populate the header row
  for (let key in header_example) {
    // Used to prevent showing the id row
    if (headers.length != 0) {
      let title = key.capitalize();
      if (Object.keys(aliases).includes(key)) {
        title = aliases[key].name.capitalize();

        // Hack to use "name only" aliases just for the header before deleting them so it doesn't break anything else
        if (aliases[key].nameonly) {
          title = aliases[key].name;
          delete aliases[key];
        }
      }
      let additional = 'class="';
      if (key === "color") {
        additional += "w-7";
      } else {
        additional += "w-auto";
      }
      additional += ' text-center f-tbl-head"';
      let element = $(
        `<th id='${key}' ${additional} data-type='${schema[key]}' onclick='sortRows(this);'>${title}</th>`
      );
      if (Object.keys(aliases).includes(key)) {
        element.addClass("aliased");
      }
      element.appendTo(headerRow);
    }
    headers.push(key);
  }
  $("<th class='w-15 text-center f-tbl-head'>Actions</th>").appendTo(headerRow);

  Object.keys(aliases).forEach((key) => {
    let $sel = getAliasSelect(
      key,
      aliases[key],
      external_data[aliases[key].query].data
    );
    aliases[key].sel = $sel;
  });
  global_aliases = aliases;
  // Populate the cells
  for (let signal of signals) {
    let signalID = headers[0] + "_" + signal[headers[0]];
    let row = drawTableRow(headers, signal, signalID, aliases);
    // draw any links/action buttons at the end
    drawActionOptions(row, headers, signal, links, actions);
    // append the final row to our table
    row.appendTo(tableBody);
  }
  signals = signals.sort(function (a, b) {
    return a[headers[0]] - b[headers[0]];
  });
  // create a row for adding a completely new row
  let $addrow = drawTableRow(headers, {}, "add-new-row", aliases);
  // it will have different actions for submission/cancellation
  let $actioncell = $("<td></td>").appendTo($addrow);
  let $actions = $("<div class='action-cell'></div>").appendTo($actioncell);
  let html =
    "<button type='submit' class='btn btn-primary' \
      onclick='insertRow(this)'>Submit</button>";
  $(html).appendTo($actions);
  html =
    "<button class='btn btn-danger ml-2' onclick='cancelAddRow(this);'> X </button>";
  $(html).appendTo($actions);
  // append it to the end of the main table
  $addrow.appendTo(tableBody);

  let $startadd = $(
    "<tr id='start-add-row' class='edit-row noselect' onclick='showAddRow();'></tr>"
  );
  $("<td colspan='" + headers.length + "'> + </td>").appendTo($startadd);
  $startadd.appendTo(tableBody);
  bindRowFunctions();
  let sortby = $($(".edit-cell")[0]).attr("id");
  sortTableByColumn($("#ruleTable"), sortby, "asc");
  //createMyTable();
}

function getAliasSelect(target, alias, data) {
  let $sel = $("<select class='" + target + "'></select>");
  for (let o of data) {
    $sel.append(
      " \
      <option value='" +
        o[alias.value] +
        "'>" +
        o[alias.col] +
        "</option>"
    );
  }
  return $sel;
}

function bindRowFunctions() {
  $("input[type='color']").change(function (event) {
    $(this).attr("value", $(this).val());
    $(this).parent().css("background-color", $(this).val());
    $(this).parent().find("label").html($(this).val());
  });

  $(".edit-cell").click(function (event) {
    editCrudRow(event);
  });

  $("#signalTable button").click(function (event) {
    let target = $(event.target);
    let signal_id = target.parent().attr("id");

    // TODO Remove the signal from the db
    console.log(signal_id);
  });
}

function cancelAddRow(elem) {
  let $row = $(elem).parents("#add-new-row");
  if ($("#add-new-row").length != 1) {
    $row.remove();
  } else {
    $row.hide();
  }
}

function showAddRow() {
  let $row = $("#add-new-row");
  const rowLength = $(".add-row").length;
  if (rowLength >= 1 && $row.is(":visible")) {
    $row = $row.clone();
    if ($($row).find(".aliased").length > 0) {
      const rangeBefore = "rangeBefore_sig_" + rowLength;
      const rangeAfter = "rangeAfter_sig_" + rowLength;
      const citRange = "citationRange_sig_" + rowLength;
      $($row).find("#rangeBefore_sig_0").attr("id", rangeBefore);
      $($row).find("#rangeAfter_sig_0").attr("id", rangeAfter);
      $($row).find("#citationRange_sig_0").attr("id", citRange);
      $($row)
        .find("#" + rangeBefore)
        .attr(
          "oninput",
          `updateTextInput(document.getElementById('${citRange}'), document.getElementById('${rangeBefore}') , document.getElementById('${rangeAfter}'), '', 1);`
        );
      $($row)
        .find("#" + rangeAfter)
        .attr(
          "oninput",
          `updateTextInput(document.getElementById('${citRange}'), document.getElementById('${rangeBefore}') , document.getElementById('${rangeAfter}'), '', 1);`
        );
    }
    $row.insertBefore($("#start-add-row"));
  }
  $row.show();
  $row.addClass("showing");
  bindRowFunctions();
  setTimeout(function () {
    $row.removeClass("showing");
  }, 500);
  $row.find("#catname").click();
  $row.find("#catname").focus();
}

// create a single row marked up for our edit table
function drawTableRow(headers, signal, signalID, aliases) {
  let row = $("<tr id='" + signalID + "' class='edit-row'></tr>");
  if (typeof signal.signal === "string") {
    signal.signal = JSON.parse(signal.signal);
  }
  if (signalID == "add-new-row") row.addClass("add-row");
  // For each entry in the json
  for (let i = 1; i < headers.length; i++) {
    let html = "<td id='" + headers[i] + "' class='edit-cell";
    if (headers[i] in aliases && signal[headers[i]]) {
      let $sel = aliases[headers[i]].sel.clone();
      html +=
        "' data-value='" +
        signal[headers[i]] +
        "'>" +
        $("option[value='" + signal[headers[i]] + "']", $sel).html();
    } else if (
      loaded_parent.id !== undefined &&
      headers[i] == loaded_parent.col
    ) {
      html += "'>" + loaded_parent.id;
    } else if (headers[i] == "color") {
      let c = signal[headers[i]] ? signal[headers[i]] : "#FFFFFF";
      html +=
        "' style='background-color:" +
        c +
        ";box-shadow: inset 0 0 0 5px " +
        c +
        ";'><input type='color' value='" +
        c +
        "'/><label contenteditable='false' class='noclick noselect'>" +
        c +
        "</label>";
    } else if (headers[i] == "signal") {
      if (signal[headers[i]]) {
        let existing = $(".edit-row").length;
        let data = signal[headers[i]];
        c = 0;
        html += ` aliased signal-cell'>`;
        for (datum of data) {
          c += 1;
          if (c > 1) {
            html += `<div class="d-flex flex-row justify-content-center m-2">
            <select id="signal_mod_${c}" >
              <option ${
                datum.modifier == "AND" ? "selected" : ""
              } value="AND">AND</option>
              <option ${
                datum.modifier == "AND NOT" ? "selected" : ""
              } value="AND NOT">AND NOT</option>
            </select>
            </div>`;
          }
          html += `
          <div class="d-flex flex-row">
            <div class="p-1" style="width:40%" >
              <ul class="list-inline">
                <li class="list-inline-item col-2 m-0 p-0" style="width:23%;">
                  <input type="range" innertext="0" min="0" max="10" value="${
                    10 - datum.range[0]
                  }" step="1" class="form-control-range slider" id="rangeBefore_sig_${existing}_${c}"
                    oninput="updateTextInput(document.getElementById('citationRange_sig_${existing}_${c}'), document.getElementById('rangeBefore_sig_${existing}_${c}'), document.getElementById('rangeAfter_sig_${existing}_${c}'), '', 1);">
                </li>
                <li class="list-inline-item align-middle m-0 p-0">
                  <label class="text-center align-middle p-0" for="formControlRange" style="margin: 0 auto 10px auto; width:158px" id="citationRange_sig_${existing}_${c}">[
                    ${datum.range[0] + 1}
                    <- Citation -> ${datum.range[1] + 1} ]</label>
                </li>
                <li class="list-inline-item m-0 p-0" style="width:23%;">
                  <input type="range" innertext="0" min="0" max="10" value="${
                    datum.range[1]
                  }" step="1" class="form-control-range slider" id="rangeAfter_sig_${existing}_${c}"
                    oninput="updateTextInput(document.getElementById('citationRange_sig_${existing}_${c}'), document.getElementById('rangeBefore_sig_${existing}_${c}'), document.getElementById('rangeAfter_sig_${existing}_${c}'), '', 1);">
                </li>
              </ul>
            </div>
            <div class="p-1 flex-fill">
              <div class=\"input-group\">
              <input type=\"text\" class=\"form-control\" id=\"signal_searchBox_${existing}_${c}\" placeholder=\"Signal\" value="${datum.query.replace(
            /"/g,
            "&quot;"
          )}">
              </div>
            </div>
          </div>`;
        }
        html += `<div id="add_signal_${signal.id}" class="d-flex flex-row justify-content-center" ondragover="allowDrop(event)" ondrop="onDrop(event,this)" onclick="addToSignal('#add_signal_${signal.id}')">
                  <h1 class="flex-fill signal-add-button">+</h1>
                </div>`;
      } else {
        let existing = $(".edit-row").length;
        html += ` aliased signal-cell'>`;
        //default values based on the search
        const beforeRangeVal = Number($("#rangeBefore").val());
        const afterRangeVal = Number($("#rangeAfter").val());
        const query = $("#searchBox").val();
        html += `
          <div class="d-flex flex-row">
            <div class="p-1" style="width:40%" >
              <ul class="list-inline">
                <li class="list-inline-item col-2 m-0 p-0" style="width:23%;">
                  <input type="range" innertext="0" min="0" max="10" value="${beforeRangeVal}" step="1" class="form-control-range slider" id="rangeBefore_sig_${existing}"
                    oninput="updateTextInput(document.getElementById('citationRange_sig_${existing}'), document.getElementById('rangeBefore_sig_${existing}'), document.getElementById('rangeAfter_sig_${existing}'), '', 1);">
                </li>
                <li class="list-inline-item align-middle m-0 p-0">
                  <label class="text-center align-middle p-0" for="formControlRange" style="margin: 0 auto 10px auto; width:158px" id="citationRange_sig_${existing}">[
                    ${$("#rangeBefore").attr("max") - beforeRangeVal + 1}
                    <- Citation -> ${afterRangeVal + 1} ]</label>
                </li>
                <li class="list-inline-item m-0 p-0" style="width:23%;">
                  <input type="range" innertext="0" min="0" max="10" value="${afterRangeVal}" step="1" class="form-control-range slider" id="rangeAfter_sig_${existing}"
                    oninput="updateTextInput(document.getElementById('citationRange_sig_${existing}'), document.getElementById('rangeBefore_sig_${existing}') , document.getElementById('rangeAfter_sig_${existing}'), '', 1);">
                </li>
              </ul>
            </div>
            <div class="p-1 flex-fill">
              <div class=\"input-group\">
              <input type=\"text\" class=\"form-control\" id=\"signal_searchBox_${existing}\" placeholder=\"Signal\" value=${query}>
              </div>
            </div>
          </div>`;
        html += `<div id="add_signal_${existing}" class="d-flex flex-row justify-content-center" ondragover="allowDrop(event)" ondrop="onDrop(event,this)" onclick="addToSignal('#add_signal_${existing}')">
          <h1 class="flex-fill signal-add-button">+</h1>
        </div>`;
      }
    } else if (signal[headers[i]]) {
      html += "'>" + signal[headers[i]];
    } else {
      html += " empty'> &lt;empty&gt;";
    }
    html += "</td>";
    $(html).appendTo(row);
  }
  return row;
}
function onDrop(event, element) {
  console.log(element);
  console.log(event.dataTransfer.getData("Text"));
  addToSignalClick("#" + element.id, event.dataTransfer.getData("Text"));
}
function allowDrop(ev) {
  ev.preventDefault();
}
function addToSignal(id) {
  let but = $(event.currentTarget);
  let existing = $(".edit-row").length;
  const beforeRangeVal = Number($("#rangeBefore").val());
  const afterRangeVal = Number($("#rangeAfter").val());
  let c = but.siblings().length;
  html = `
  <div class="d-flex flex-row justify-content-center m-2">
    <select id="signal_mod_${existing}_${c}" >
      <option selected value="AND">AND</option>
      <option value="AND NOT">AND NOT</option>
    </select>
    </div>
  <div class="d-flex flex-row">
    <div class="p-1" style="width:40%" >
      <ul class="list-inline">
        <li class="list-inline-item col-2 m-0 p-0" style="width:23%;">
          <input type="range" innertext="0" min="0" max="10" value="${beforeRangeVal}" step="1" class="form-control-range slider" id="rangeBefore_sig_${existing}_${c}"
            oninput="updateTextInput(document.getElementById('citationRange_sig_${existing}_${c}'), document.getElementById('rangeBefore_sig_${existing}_${c}') , document.getElementById('rangeAfter_sig_${existing}_${c}'), '', 1);">
        </li>
        <li class="list-inline-item align-middle m-0 p-0">
          <label class="text-center align-middle p-0" for="formControlRange" style="margin: 0 auto 10px auto; width:158px" id="citationRange_sig_${existing}_${c}">[
            ${$("#rangeBefore").attr("max") - beforeRangeVal + 1}
            <- Citation -> ${afterRangeVal + 1} ]</label>
        </li>
        <li class="list-inline-item m-0 p-0" style="width:23%;">
          <input type="range" innertext="0" min="0" max="10" value="${afterRangeVal}" step="1" class="form-control-range slider" id="rangeAfter_sig_${existing}_${c}"
            oninput="updateTextInput(document.getElementById('citationRange_sig_${existing}_${c}'), document.getElementById('rangeBefore_sig_${existing}_${c}') , document.getElementById('rangeAfter_sig_${existing}_${c}'), '', 1);">
        </li>
      </ul>
    </div>
    <div class="p-1 flex-fill">
      <div class=\"input-group\">
      <input type=\"text\" class=\"form-control\" id=\"signal_searchBox_${existing}_${c}\" placeholder=\"Signal\">
      </div>
    </div>
  </div>`;
  $(html).insertBefore(but);
}

function addToSignalClick(target, query, modifier = "AND") {
  let but = $(target);
  let existing = $(".edit-row").length;
  const beforeRangeVal = Number($("#rangeBefore").val());
  const afterRangeVal = Number($("#rangeAfter").val());
  let c = but.siblings().length;
  html = `
  <div class="d-flex flex-row justify-content-center m-2">
    <select id="signal_mod_${existing}_${c}" >
      <option ${modifier == "AND" ? "selected" : ""} value="AND">AND</option>
      <option ${
        modifier == "AND NOT" ? "selected" : ""
      } value="AND NOT">AND NOT</option>
    </select>
    </div>
  <div class="d-flex flex-row">
    <div class="p-1" style="width:40%" >
      <ul class="list-inline">
        <li class="list-inline-item col-2 m-0 p-0" style="width:23%;">
          <input type="range" innertext="0" min="0" max="10" value="${beforeRangeVal}" step="1" class="form-control-range slider" id="rangeBefore_sig_${existing}_${c}"
            oninput="updateTextInput(document.getElementById('citationRange_sig_${existing}_${c}'), document.getElementById('rangeBefore_sig_${existing}_${c}') , document.getElementById('rangeAfter_sig_${existing}_${c}'), '', 1);">
        </li>
        <li class="list-inline-item align-middle m-0 p-0">
          <label class="text-center align-middle p-0" for="formControlRange" style="margin: 0 auto 10px auto; width:158px" id="citationRange_sig_${existing}_${c}">[
            ${$("#rangeBefore").attr("max") - beforeRangeVal}
            <- Citation -> ${afterRangeVal} ]</label>
        </li>
        <li class="list-inline-item m-0 p-0" style="width:23%;">
          <input type="range" innertext="0" min="0" max="10" value="${afterRangeVal}" step="1" class="form-control-range slider" id="rangeAfter_sig_${existing}_${c}"
            oninput="updateTextInput(document.getElementById('citationRange_sig_${existing}_${c}'), document.getElementById('rangeBefore_sig_${existing}_${c}') , document.getElementById('rangeAfter_sig_${existing}_${c}'), '', 1);">
        </li>
      </ul>
    </div>
    <div class="p-1 flex-fill">
      <div class=\"input-group\">
      <input type=\"text\" class=\"form-control\" id=\"signal_searchBox_${existing}_${c}\" placeholder=\"Signal\" value="${query}">
      </div>
    </div>
  </div>`;
  $(html).insertBefore(but);
}

// append defined links or actions at the end of each row as a cell
function drawActionOptions(row, headers, signal, links, actions) {
  // create link buttons
  let $actioncell = $("<td></td>");
  let $actions = $("<div class='action-cell'></div>");
  // Add the remove button first

  if (typeof links != "undefined") {
    Object.keys(links).forEach((key) => {
      let link = links[key];
      let params = {};
      Object.keys(link.params).forEach((id) => {
        params[link.params[id]] = signal[id];
      });
      params["table_name"] = link.query;
      let html =
        "<button class='btn btn-primary ml-2 more-actions' onclick='loadTable(\"" +
        "rules-table" +
        '",' +
        JSON.stringify(params).replace(/\\"/g, "'") +
        ")'>" +
        key +
        "</button>";
      $(html).appendTo($actions);
    });
  }
  // create action buttons that perform some sort of "action"
  if (actions.length > 0) {
    Object.keys(actions).forEach((key) => {
      let action = actions[key];
      let params = {};
      let html =
        "<button class='btn btn-primary ml-2 more-actions' onclick='" +
        action +
        "(this)'>" +
        key +
        "</button>";
      $(html).appendTo($actions);
    });
  }
  let html =
    "<button class='btn btn-danger ml-2' onclick='deleteRow(" +
    signal[headers[0]] +
    ")'> X </button>";
  $(html).appendTo($actions);
  // append actions to table
  $actions.appendTo($actioncell);
  $actioncell.appendTo(row);
}

// Deselect a row (and possibly edit the content)
function deselectCrudRows(update) {
  // Get all rows
  let rows = $("#ruleTable > tbody > tr");
  for (let i = 0; i < rows.length; i++) {
    let row = $(rows[i]);
    row.removeClass("editing");
    // If the row is being edited
    if (row.attr("id").includes("_edited") || row.attr("id") == "add-new-row") {
      let row_elements = row.children();

      for (let i = 0; i < row_elements.length; i++) {
        let row_element = $(row_elements[i]);

        if (row_element.hasClass("signal-cell")) {
          row_element.removeAttr("contenteditable");
          continue;
        }

        // Revert all TD's back to their original values
        // or update them
        if (row_element.prop("tagName") == "TD") {
          let row_element_id = row_element.attr("id");

          if (!update) {
            let row_element_val = row_element.data("original");
            if (row_element.hasClass("empty")) {
              row_element.text("<empty>");
            } else {
              if (row_element.attr("id") == "color") {
                row_element.css(
                  "background-color",
                  $("label", row_element).html()
                );
                $("input[type=color]", row_element).attr(
                  "value",
                  $("label", row_element).html()
                );
              } else {
                row_element.text(row_element_val);
              }
            }
          }
          row_element.removeAttr("contenteditable");
        }
      }

      // Remove the submit button
      $("#submit_crud_row").remove();

      // Revert the row's name to show that it's not edited
      let row_id = row.attr("id").split("_edited")[0];
      row.attr("id", row_id);
    }
  }
}

// Allow a row to be edited
function editCrudRow(event) {
  let $color_picker = $("input[type='color']", event.target);
  if ($color_picker.length > 0) $color_picker[0].click();
  let selected_row = $(event.target).parents(".edit-row");
  let row_elements = selected_row.children();
  // If the row hasn't been selected for editing already
  if (!$(selected_row).hasClass("editing")) {
    // Deselect all other rows
    deselectCrudRows(false);

    // Clone the elements (for restoring if deselected)
    for (let i = 0; i < row_elements.length - 1; i++) {
      // Get the element and copy its original value to the id
      let row_element = $(row_elements[i]);
      let row_element_value = row_element.text();
      let row_element_id = row_element.attr("id");
      row_element.data("original", row_element_value);
      row_element.attr("id", row_element_id);
      if ($("th#" + row_element_id).hasClass("aliased")) {
        let $sel = global_aliases[row_element_id].sel;
        row_element.html($sel);
        $("select." + row_element_id, row_element).val(
          row_element.data("value")
        );
        row_element.addClass("aliased");
      } else {
        if (!row_element.hasClass("signal-cell")) {
          row_element.attr("contenteditable", "true");
        }
        if (row_element_id !== "color") {
          // Allow the cell to be edited

          // Disable enter presses in editable cells
          row_element.keypress(function (event) {
            if (event.keyCode == 13) {
              event.preventDefault();
            }
          });
        } else {
          // row_element.attr('contenteditable', 'false');
          row_element.focus((event) => {
            // row_element.removeAttr('contenteditable')
            console.log(
              "focused",
              $(event.target.parent),
              event.target,
              event.target.parent
            );

            $(event.target).find("input[type=color]").click();
          });
        }
      }
    }
    $("td.empty:not(.aliased)", selected_row).html("");
    // Flag the row as edited
    selected_row.addClass("editing");

    // Add a button to submit the changes
    if (selected_row.attr("id") != "add-new-row") {
      selected_row.attr("id", selected_row.attr("id") + "_edited");
      let html =
        "<button id='submit_crud_row' class='btn btn-warning ml-2' onclick='updateRow(this);'> ✓ </button>";
      let submit_edit_button = $(html).appendTo(
        $(".action-cell", selected_row)
      );
    }
    // Focus on the clicked element
    $(event.target).focus();
  }
}

function loadPreviousTable() {
  if (
    last_load.root !== undefined &&
    Object.entries(last_load.root).length > 0
  ) {
    loadTable(
      last_load.root.table_name,
      last_load.root.params,
      last_load.root.draw_table,
      last_load.root.callback,
      false
    );
  }
}

function reloadTable() {
  loadTable(
    last_load.table_name,
    last_load.params,
    last_load.draw_table,
    last_load.callback
  );
}

// delete a row
function deleteRow(id) {
  if ($("#id_" + id + "_edited").hasClass("editing")) {
    deselectCrudRows();
    return;
  }
  $.ajax({
    type: "POST",
    url: currentURL + "api/delete",
    data: JSON.stringify({
      table_name: loaded_table,
      id: id,
    }),
    success: function (results) {
      reloadTable();
      toast("Success!", "Row was deleted from the database.");
    },
    error: function (err) {
      console.log(err);
    },
  });
}

// insert a new row
function insertRow(elem) {
  let $row = $(elem).parents(".edit-row"),
    values = {},
    valid_update = true;
  let table = loaded_table;
  if (loaded_table == "filter" || loaded_table == "restriction")
    table = "signal";
  // iterate through each cell
  $(".edit-cell", $row).each(function (index) {
    let field_name = $(this).attr("id");
    let val = "";
    if ($(this).hasClass("aliased")) {
      const res = [];
      const numElements = $(this).find("[id*='signal_searchBox']").length;
      //get range
      let beforeRange = $(this).find("[id*='rangeBefore']")[0];
      let beforeRangeVal = beforeRange.max - beforeRange.value;
      let afterRange = $(this).find("[id*='rangeAfter']")[0];
      let afterRangeVal = Number(afterRange.value);
      //get query
      let query = $(this).find("[id*='signal_searchBox_']")[0].value;
      res.push({ range: [beforeRangeVal, afterRangeVal], query: query });
      for (let i = 1; i < numElements; ++i) {
        beforeRange = $(this).find("[id*='rangeBefore']")[i];
        beforeRangeVal = Number(beforeRange.max - beforeRange.value);
        afterRange = $(this).find("[id*='rangeAfter']")[i];
        afterRangeVal = Number(afterRange.value);
        //get modifier
        const modifier = $(this).find("[id*='signal_mod_']")[i - 1].value;
        //get query
        query = $(this).find("[id*='signal_searchBox_']")[i].value;
        res.push({
          range: [beforeRangeVal, afterRangeVal],
          query: query,
          modifier: modifier,
        });
      }
      val = JSON.stringify(res);
    } else {
      val = $(this).html();
    }
    // validate that the data type is correct for this cell
    let type = $("th#" + field_name).data("type");
    [valid_update, val] = validateDataType(val, type);
    // if it's not valid, throw an error and stop trying to update
    if (!valid_update) {
      toast(
        execute,
        "ERROR",
        'Invalid value "' + val + '" for ' + field_name + " of type " + type
      );
      return false;
    }
    if (field_name == "color") {
      val = $("input[type='color']", this).val();
    }
    // add to our values to update
    if (val == "") values[field_name] = null;
    else values[field_name] = val;
  });

  if (!valid_update) return;

  values["id"] = $row.attr("id").split("_")[1];
  if (loaded_parent.id !== undefined)
    values[loaded_parent.col] = loaded_parent.id;

  postInsert(table, values, function (results) {
    reloadTable();
    toast("Success!", "Row was inserted to the database.");
    const words = JSON.parse(values.signal).map((x) =>
      x.query.replace(" ", "_")
    );
    postSuggestions(words, function (res) {
      let html = "";
      const div = $($row).find("[id*='add_signal_']")[0].id;
      for (let i = 0; i < res.suggestions.length; ++i) {
        const query = res.suggestions[i][0].replace("_", " ");
        html += `
        <div class="custom-control custom-checkbox my-1 mr-sm-2">
        <input type="checkbox" class="custom-control-input" id="customControlInline-${i}" onclick="suggestionClick(this, '${div}', '${query}');">
        <label class="custom-control-label" for="customControlInline-${i}">${query}</label>
      </div>`;
      }
      toast("Suggestions", html);
    });
  });
}
// update a table using a datastructure that should remain consistent
// JSON object that must include an id
function updateRow(elem) {
  let $row = $(elem).parents(".edit-row"),
    values = {},
    valid_update = true;

  // iterate through each cell
  $(".edit-cell", $row).each(function (index) {
    let field_name = $(this).attr("id");
    let val = $(this).html();
    // if we are aliased, we got to get the value from a select option
    if ($("th#" + field_name).hasClass("aliased")) {
      [valid_update, val] = validateDataType(
        $("select." + field_name, this).val(),
        type
      );
    } else {
      // validate that the data type is correct for this cell
      let type = $("th#" + field_name).data("type");
      [valid_update, val] = validateDataType(val, type);
      // if it's not valid, throw an error and stop trying to update
      if (!valid_update) {
        toast(
          "ERROR",
          'Invalid value "' + val + '" for ' + field_name + " of type " + type
        );
        return false;
      }
    }
    if (field_name == "color") {
      val = $("input[type='color']", this).val();
    }

    // add to our values to update
    if (val == "") values[field_name] = null;
    else values[field_name] = val;

    if (field_name == "signal") {
      val = [];
      let inps = $("select,input", this);

      for (let i = 0; i < inps.length; i += 4) {
        let range_Left = parseInt(inps[i].max - $(inps[i]).val());
        let range_Right = parseInt($(inps[i + 1]).val());
        let query = $(inps[i + 2]).val();

        let record = {
          range: [Number(range_Left), Number(range_Right)],
          query: query,
        };
        if (i >= 4) {
          let modifier = $(inps[i - 1]).val();

          record["modifier"] = modifier;
        }

        val.push(record);
      }
      values[field_name] = JSON.stringify(val);
    }
  });

  if (!valid_update) return;
  values["id"] = $row.attr("id").split("_")[1];
  // ship the update to the server then reload the table
  postUpdate(loaded_table, values, function (results) {
    reloadTable();
    toast("Success!", "Row was updated in the database.");
    const words = JSON.parse(values.signal).map((x) =>
      x.query.replace(" ", "_")
    );
    postSuggestions(words, function (res) {
      let html = "";
      const div = $($row).find("[id*='add_signal_']")[0].id;
      for (let i = 0; i < res.suggestions.length; ++i) {
        const query = res.suggestions[i][0].replace("_", " ");
        html += `
        <div class="custom-control custom-checkbox my-1 mr-sm-2">
        <input type="checkbox" class="custom-control-input" id="customControlInline-${i}" onclick="suggestionClick(this, '${div}', '${query}');">
        <label class="custom-control-label" for="customControlInline-${i}">${query}</label>
      </div>`;
      }
      toast("Suggestions", html);
    });
  });
}

function suggestionClick(cb, id, query) {
  console.log("clicked");
  if (cb.checked) {
    addToSignalClick("#" + id, query);
  } else {
  }
}
//this removes only for the toast notification dont use else where
function removeSignal(id, query) {
  let siblings = $(id).siblings();
  for (let i = 0; i < siblings.length; ++i) {
    const searchBox = $(siblings[i]).find("[id*='signal_searchBox_']");
    if (searchBox.value == query) {
      siblings[i - 1].remove();
      siblings[i].remove();
      return;
    }
  }
}
// hook for sending row updates
function postUpdate(table_name, values, callback) {
  $.ajax({
    type: "POST",
    url: currentURL + "api/update",
    data: JSON.stringify({
      table_name: table_name,
      values: values,
    }),
    success: function (results) {
      if (typeof callback != "undefined") callback(results);
    },
  });
}

// hook for sending row inserts
function postInsert(table_name, values, callback) {
  $.ajax({
    type: "POST",
    url: currentURL + "api/add-rule-set",
    contentType: "application/json",
    data: JSON.stringify({
      table_name: table_name,
      values: values,
    }),
    success: function (results) {
      if (typeof callback != "undefined") callback(results);
    },
  });
}
/**
 *
 * @param {Array.<string>} words
 * @param {function({suggestions:Array.<string>})} callback
 */
function postSuggestions(words, callback) {
  $.ajax({
    type: "POST",
    url: currentURL + "api/get-recommended-word",
    data: JSON.stringify(words),
    success: function (results) {
      console.log(results);
      callback(results);
    },
  });
}

function validateDataType(data, type) {
  if (data == "") return [true, data];
  switch (type) {
    case "integer":
      return [!isNaN(parseInt(data)), parseInt(data)];
      break;
    case "character varying":
    // return [true, data] # calls default instead
    default:
      return [data === data.toString(), data];
  }
}

function sortRows(elem) {
  let $header = $(elem);
  let alias = $header.html();
  if ($header.hasClass("asc")) {
    // switch to descending sort
    $header.addClass("desc");
    $header.removeClass("asc");
    $header.html(alias.substring(0, alias.length - 1) + " &#8638;");
    sortTableByColumn($("#ruleTable"), $header.attr("id"), "desc");
  } else if ($header.hasClass("desc")) {
    // remove sort
    $header.removeClass("sort");
    $header.removeClass("desc");
    $header.html(alias.substring(0, alias.length - 2));
    let sortby = $($(".edit-cell")[0]).attr("id");
    sortTableByColumn($("#ruleTable"), sortby, "asc");
  } else {
    // switch to ascending sort
    $header.addClass("sort");
    $header.addClass("asc");
    $header.html(alias + " &#8642;");
    sortTableByColumn($("#ruleTable"), $header.attr("id"), "asc");
  }
  for (let h of $header.siblings("th.sort")) {
    let $h = $(h);
    let orig = $h.html();
    let clean = orig.substring(0, orig.length - 2);
    $h.html(clean);
    $h.removeClass("sort");
    $h.removeClass("asc");
    $h.removeClass("desc");
  }
}

function sortTableByColumn(table, column, order) {
  let asc = order === "asc",
    tbody = table.find("tbody"),
    $startrow = $("#start-add-row").remove(),
    $addrow = $(".add-row").remove();
  type = $("th#" + column).data("type");
  tbody
    .find("tr")
    .sort(function (a, b) {
      let valA = $.trim($("td#" + column, a).text()),
        valB = $.trim($("td#" + column, b).text());
      if (type == "integer" && !$("th#" + column).hasClass("aliased")) {
        if (valA == "<empty>") valA = 0;
        if (valB == "<empty>") valB = 0;
        valA = parseInt(valA);
        valB = parseInt(valB);
        if (asc) return valA > valB;
        else valB > valA;
      } else {
        if (valA == "<empty>") valA = "";
        if (valB == "<empty>") valB = "";
        if (asc) return valA.localeCompare(valB);
        else return valB.localeCompare(valA);
      }
    })
    .appendTo(tbody);
  $addrow.appendTo(tbody);
  $startrow.appendTo(tbody);
}

function getTableTitle(tableName) {
  switch (tableName) {
    case "signalcategory":
      return "Categories";
      break;
    case "signalbycategory":
      return sentiment_categories[loaded_parent.id].name + " Rules";
      break;
    case "filter":
      return 'Filters for "' + sentiment_signals[loaded_parent.id].signal + '"';
      break;
    case "restriction":
      return (
        'Restrictions for "' + sentiment_signals[loaded_parent.id].signal + '"'
      );
      break;
    case "signal":
      return "All Rules";
      break;
    default:
      break;
  }
}

function rgbToHex(rgb) {
  rgb = rgb.replace("rgb(", "").replace(")", "");
  let colors = rgb.split(","),
    r = colors[0],
    g = colors[1],
    b = colors[2];
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function createMyTable() {
  let table = new Table(3, $("#container"), "myTable");
  table.setHeaderNames(["1st column", "2nd column", "3rd column"]);
  table.appendTableToDom();
}
