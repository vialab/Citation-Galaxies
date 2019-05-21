var last_load = {};
var loaded_table = "";
var loaded_parent = {id: undefined, col: undefined};
var global_aliases;

$(document).ready(function() {
  /* CRUD processes are not based on search, although a nice touch would be
    having the ability to filter the results
     */

  $(document).mouseup(function(e) {
    // not editing, so we don't need to do anything
    if ($(".edit-row.editing").length == 0) return;
    if (
      !$(e.target)
        .parents(".edit-row")
        .hasClass("editing")
    ) {
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
    data: {
      values: JSON.stringify(params)
    },
    success: function(results) {
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
    async: _async
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
  callback = undefined
) {
  if (typeof params == "string") params = JSON.parse(params);
  loadData(
    table_name,
    function(results, aliases, links, actions, name, schema, parent) {
      if (typeof callback != "undefined") callback(results);
      if (draw_table) {
        clearCrudTable();
        loaded_table = table_name;
        loaded_parent = parent;
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
          Object.keys(aliases).forEach(key => {
            if (aliases[key].query !== undefined) {
              let table_name = aliases[key].query;
              let f = () =>
                $.ajax({
                  type: "POST",
                  url: currentURL + "api/" + table_name,
                  data: {values: JSON.stringify({})},
                  success: results => {
                    external_data[table_name] = results;
                  }
                });
              // push ajax function into our queue
              wait_queue.push(f());
            }
          });
          // if we have things to load, load them synchronously
          if (wait_queue.length > 0) {
            let waiting = true,
              wait = 0;
            $.when(...wait_queue).done(function() {
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

      last_load = {
        table_name: table_name,
        params: params,
        draw_table: draw_table,
        callback: callback,
        timestamp: new Date().getTime()
      };
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
      let title = key;
      if (Object.keys(aliases).includes(key)) {
        title = aliases[key].name;
      }
      let element = $(
        "<th id='" +
          key +
          "' data-type='" +
          schema[key] +
          "' onclick='sortRows(this);'>" +
          title +
          "</th>"
      );
      if (Object.keys(aliases).includes(key)) {
        element.addClass("aliased");
      }
      element.appendTo(headerRow);
    }
    headers.push(key);
  }
  $("<th>actions</th>").appendTo(headerRow);

  Object.keys(aliases).forEach(key => {
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
  signals = signals.sort(function(a, b) {
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
  $(".edit-cell").click(function(event) {
    editCrudRow(event);
  });

  $("#signalTable button").click(function(event) {
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
  if ($row.length >= 1 && $row.is(":visible")) {
    $row = $row.clone();
    $row.insertBefore($("#start-add-row"));
    bindRowFunctions();
  }
  $row.show();
  $row.addClass("showing");
  setTimeout(function() {
    $row.removeClass("showing");
  }, 500);
}

// create a single row marked up for our edit table
function drawTableRow(headers, signal, signalID, aliases) {
  let row = $("<tr id='" + signalID + "' class='edit-row'></tr>");
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

// append defined links or actions at the end of each row as a cell
function drawActionOptions(row, headers, signal, links, actions) {
  // create link buttons
  let $actioncell = $("<td></td>");
  let $actions = $("<div class='action-cell'></div>");
  // Add the remove button first

  if (typeof links != "undefined") {
    Object.keys(links).forEach(key => {
      let link = links[key];
      let params = {};
      Object.keys(link.params).forEach(id => {
        params[link.params[id]] = signal[id];
      });
      let html =
        "<button class='btn btn-primary ml-2 more-actions' onclick='loadTable(\"" +
        link.query +
        '",' +
        JSON.stringify(params).replace(/\\"/g, "'") +
        ")'>" +
        key +
        "</button>";
      $(html).appendTo($actions);
    });
  }
  // create action buttons that perform some sort of "action"
  if (typeof actions != "undefined") {
    Object.keys(actions).forEach(key => {
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

        // Revert all TD's back to their original values
        // or update them
        if (row_element.prop("tagName") == "TD") {
          let row_element_id = row_element.attr("id");

          if (!update) {
            let row_element_val = row_element.data("original");
            if (row_element.hasClass("empty")) {
              row_element.text("<empty>");
            } else {
              row_element.text(row_element_val);
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
        // Allow the cell to be edited
        row_element.attr("contenteditable", "true");
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
  console.log(id);
  $.ajax({
    type: "POST",
    url: currentURL + "api/delete",
    data: {
      table_name: loaded_table,
      id: id
    },
    success: function(results) {
      reloadTable();
      toast("Success!", "Row was deleted from the database.");
    },
    error: function(err) {
      console.log(err);
    }
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
  $(".edit-cell", $row).each(function(index) {
    let field_name = $(this).attr("id");
    let val = $(this).html();
    // validate that the data type is correct for this cell
    let type = $("th#" + field_name).data("type");
    valid_update = validateDataType(val, type);
    // if it's not valid, throw an error and stop trying to update
    if (!valid_update) {
      toast(
        "ERROR",
        'Invalid value "' + val + '" for ' + field_name + " of type " + type
      );
      return false;
    }
    // add to our values to update
    if (val == "") values[field_name] = null;
    else values[field_name] = val;
  });

  if (!valid_update) return;

  values["id"] = $row.attr("id").split("_")[1];
  if (loaded_parent.id !== undefined)
    values[loaded_parent.col] = loaded_parent.id;

  postInsert(table, values, function(results) {
    reloadTable();
    toast("Success!", "Row was inserted to the database.");
  });
}

// update a table using a datastructure that should remain consistent
// JSON object that must include an id
function updateRow(elem) {
  let $row = $(elem).parents(".edit-row"),
    values = {},
    valid_update = true;

  // iterate through each cell
  $(".edit-cell", $row).each(function(index) {
    let field_name = $(this).attr("id");
    let val = $(this).html();
    // if we are aliased, we got to get the value from a select option
    if ($("th#" + field_name).hasClass("aliased")) {
      val = $("select." + field_name, this).val();
    } else {
      // validate that the data type is correct for this cell
      let type = $("th#" + field_name).data("type");
      valid_update = validateDataType(val, type);
      // if it's not valid, throw an error and stop trying to update
      if (!valid_update) {
        toast(
          "ERROR",
          'Invalid value "' + val + '" for ' + field_name + " of type " + type
        );
        return false;
      }
    }

    // add to our values to update
    if (val == "") values[field_name] = null;
    else values[field_name] = val;
  });

  if (!valid_update) return;
  values["id"] = $row.attr("id").split("_")[1];
  // ship the update to the server then reload the table
  postUpdate(loaded_table, values, function(results) {
    reloadTable();
    toast("Success!", "Row was updated in the database.");
  });
}

// hook for sending row updates
function postUpdate(table_name, values, callback) {
  $.ajax({
    type: "POST",
    url: currentURL + "api/update",
    data: {
      table_name: table_name,
      values: JSON.stringify(values)
    },
    success: function(results) {
      if (typeof callback != "undefined") callback(results);
    }
  });
}

// hook for sending row inserts
function postInsert(table_name, values, callback) {
  $.ajax({
    type: "POST",
    url: currentURL + "api/insert",
    data: {
      table_name: table_name,
      values: JSON.stringify(values)
    },
    success: function(results) {
      if (typeof callback != "undefined") callback(results);
    }
  });
}

function validateDataType(data, type) {
  if (data == "") return true;
  switch (type) {
    case "integer":
      return !isNaN(parseInt(data));
      break;
    case "character varying":
    default:
      return data === data.toString();
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
    $addrow = $("#start-add-row").remove();
  type = $("th#" + column).data("type");
  tbody
    .find("tr")
    .sort(function(a, b) {
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
}
