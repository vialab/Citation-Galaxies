var last_load = {};

$(document).ready(function () {


    /* CRUD processes are not based on search, although a nice touch would be
    having the ability to filter the results
     */

    $(document).mouseup(function(e) {
      let container = $("#ruleTable");
      if(!container.is(e.target) && container.has(e.target).length === 0) {
        deselectCrudRows(false);
      }
    })
});


// query for some data
function loadData(url, callback, params={}, _async=true) {
  // first get the categories
  $.ajax({
    type: 'POST',
    url: currentURL + "api/" + url,
    data: {
        'values': JSON.stringify(params)
    },
    success: function(results) {
      // console.log(results);
      callback(results["data"], results["links"], results["actions"], results["name"], results["schema"], results["parent"]);
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
function loadTable(table_name, params, draw_table=true, callback=undefined) {

  if(typeof(params) == "string") params = JSON.parse(params);
  loadData(table_name, function (results, links, actions, name, schema, parent) {
    if(typeof(callback) != "undefined") callback(results);
    if(draw_table) {
      $("#ruleTable").data("query", table_name);
      clearCrudTable();
      populateTable(results, name, $("#ruleTable"), links, actions, schema, parent);
    }
    last_load = { table_name: table_name
      , params: params
      , draw_table: draw_table
      , callback: callback
    }
  }, params);
}

function populateTable(signals, name, table, links, actions, schema, parent) {
    table.html("");

    // Create the header row
    let tableHeader = $("<thead></thead>").appendTo(table);
    let tableBody = $("<tbody></tbody>").appendTo(table);
    let headerRow = $("<tr></tr>").appendTo(tableHeader);

    // Create a array to hold the keys from the json
    // To be used as the header to the table
    let headers = [];
    let header_example = signals[0];
    if(signals.length == 0) header_example = schema;

    // Populate the header row
    for (let key in header_example) {
        // Used to prevent showing the id row
        if (headers.length != 0) {
            let element = $("<th data-type='" + schema[key] + "'>" + key + "</th>");
            element.appendTo(headerRow);
        }
        headers.push(key);
    }
    $("<th>actions</th>").appendTo(headerRow);
    // set the parentid in the form if we have one
    if(parent.id !== undefined) {
      $("#" + parent.col + "_field").val(parent.id);
    }

    // Populate the cells
    for (let signal of signals) {
        let signalID = headers[0] + "_" + signal[headers[0]];
        let row = drawTableRow(headers, signal, signalID);
        // draw any links/action buttons at the end
        drawActionOptions(row, headers, signal, links, actions);
        // append the final row to our table
        row.appendTo(tableBody);
    }
    // create a row for adding a completely new row
    let $addrow = drawTableRow(headers, {}, 'add-new-row');
    // it will have different actions for submission/cancellation
    let $actioncell = $("<td></td>").appendTo($addrow);
    let $actions = $("<div class='action-cell'></div>").appendTo($actioncell);
    let html = "<button type='submit' class='btn btn-primary' \
      onclick='insertRow(\"" + name + "\"";
    if(parent.id !== undefined) {
      html += ", \"" + parent.col + "\"," + parent.id;
    }
    html += ")'>Submit</button>";
    $(html).appendTo($actions);
    html = "<button class='btn btn-danger ml-2' onclick='cancelAddRow(this);'> X </button>";
    $(html).appendTo($actions);
    // append it to the end of the main table
    $addrow.appendTo(tableBody);

    let $startadd = $("<tr id='start-add-row' class='edit-row noselect' onclick='showAddRow();'></tr>");
    $("<td colspan='" + headers.length + "'> + </td>").appendTo($startadd);
    $startadd.appendTo(tableBody);
    bindRowFunctions();
}

function bindRowFunctions() {
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
  if($("#add-new-row").length != 1) {
    $row.remove();
  } else {
    $row.hide();
  }
}

function showAddRow() {
  let $row = $("#add-new-row");
  if($row.length >= 1 && $row.is(":visible")) {
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
function drawTableRow(headers, signal, signalID) {
  let row = $("<tr id='" + signalID + "' class='edit-row'></tr>");
  // For each entry in the json
  for (let i = 1; i < headers.length; i++) {
    let html = "<td id='" + headers[i] + "' class='edit-cell";
    if(signal[headers[i]]) {
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

  if(typeof(links) != "undefined") {
    Object.keys(links).forEach(key => {
      let link = links[key];
      let params = {};
      Object.keys(link.params).forEach(id => {
        params[link.params[id]] = signal[id];
      })
      let html = "<button class='btn btn-primary ml-2 more-actions' onclick='loadTable(\""
        + link.query + "\","  + JSON.stringify(params).replace(/\\"/g, '\'')
        + ")'>" + key + "</button>";
      $(html).appendTo($actions);
    });
  }
  // create action buttons that perform some sort of "action"
  if(typeof(actions) != "undefined") {
    Object.keys(actions).forEach(key => {
      let action = actions[key];
      let params = {};
      let html = "<button class='btn btn-primary ml-2 more-actions' onclick='"
        + action + "(this)'>" + key + "</button>";
      $(html).appendTo($actions);
    });
  }
  let html = "<button class='btn btn-danger ml-2' onclick='deleteRow(\""
    + name + "\"," + signal[headers[0]] + ")'> X </button>";
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
                        if(row_element.hasClass("empty")) {
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
  let selected_row = $(event.target).parent();
  let row_elements = selected_row.children();
  // If the row hasn't been selected for editing already
  if (!selected_row.attr("id").includes("_edited")) {
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

        // Allow the cell to be edited
        row_element.attr('contenteditable', 'true');
    }
    $("td.empty", selected_row).html("")
    // Flag the row as edited
    selected_row.addClass("editing");

    // Add a button to submit the changes
    if(selected_row.attr("id") != "add-new-row") {
      selected_row.attr("id", selected_row.attr("id") + "_edited");
      let html = "<button id='submit_crud_row' class='btn btn-warning ml-2' onclick='updateRow'> ✓ </button>";
      let submit_edit_button = $(html).appendTo($(".action-cell",selected_row));
      // When clicked, submit the data and deselect the row
      submit_edit_button.click(function (event) {
          deselectCrudRows(true);
      });
    }
    // Focus on the clicked element
    $(event.target).focus();
  }
}

function reloadTable() {
  loadTable(last_load.table_name, last_load.params, last_load.draw_table, last_load.callback);
}

// delete a row
function deleteRow(table_name, id) {
  let self = this;
  $.ajax({
    type: "POST",
    url: currentURL + "api/delete",
    data: {
      "table_name": table_name
      , "id": id
    },
    success: function(results) {
      reloadTable();
      toast("Success!", "Row was deleted from the database.");
    }
    , error: function(err) {
      console.log(err);
    }
  });
}

// insert a new row
function insertRow(table_name, parent_col, parent_id) {
  let self = this
    , values = {};

  $("#ruleForm input").each(function(index) {
    let field_name = $(this).attr("id").split("_")[0];
    values[field_name] = $(this).val();
  });

  if(parentid !== undefined) values[parent_col] = parentid;

  postInsert(table_name, values, function(results) {
    console.log("inserted!");
    reloadTable();
    toast("Success!", "Row was inserted to the database.");
  });
}

// update a table using a datastructure that should remain consistent
// JSON object that must include an id
function updateRow(table_name, id) {
  let elem = $("#id_"+id)
    , values = {};

  $(".edit-cell", elem).each(function(index) {
    let field_name = $(this).attr("id");
    values[field_name] = $(this).val();
  });

  postInsert(table_name, values, function(results) {
    console.log("inserted!");
    reloadTable();
    toast("Success!", "Row was updated in the database.");
  })
}

function postInsert(table_name, values, callback) {
  $.ajax({
    type: "POST",
    url: currentURL + "api/insert",
    data: {
      "table_name": table_name
      , "values": JSON.stringify(values)
    },
    success: function(results) {
      if(typeof(callback) != "undefined") callback(results);
    }
  });
}
