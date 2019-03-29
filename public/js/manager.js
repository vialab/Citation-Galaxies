var last_load = {};

$(document).ready(function () {


    /* CRUD processes are not based on search, although a nice touch would be
    having the ability to filter the results
     */


    // On submit for the rule CRUD
    $("#ruleForm").submit(function (event) {
        // Prevent the page from reloading
        event.preventDefault();
    });

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
      callback(results["data"], results["links"], results["actions"], results["name"], results["schema"]);
    },
    async: _async
  });
}

// clear the form and clear the table of any results
function clearCrudTable() {
    let table = $("#ruleTable");
    let form = $("#ruleForm");
    form.children().remove();
    table.children().remove();
    $("#ruleForm")[0].reset();
}

// dynamically load data from a query and show results in a table
function loadTable(table_name, params, draw_table=true, callback=undefined) {

  if(typeof(params) == "string") params = JSON.parse(params);
  loadData(table_name, function (results, links, actions, name, schema) {
    if(typeof(callback) != "undefined") callback(results);
    if(draw_table) {
      $("#ruleTable").data("query", table_name);
      clearCrudTable();
      populateTable(results, name, $("#ruleTable"), links, actions, schema);
    }
    last_load = { table_name: table_name
      , params: params
      , draw_table: draw_table
      , callback: callback
    }
  }, params);
}

function populateTable(signals, name, table, links, actions, schema) {
  table.html("");
    // Create the header row
    let tableHeader = $("<thead></thead>").appendTo(table);
    let tableBody = $("<tbody></tbody>").appendTo(table);
    let headerRow = $("<tr></tr>").appendTo(tableHeader);

    // Get the form
    let form = $("<div class='form-group'></div>").appendTo($("#ruleForm"));

    // Create a array to hold the keys from the json
    // To be used as the header to the table
    let headers = [];
    // Populate the header row
    for (let key in signals[0]) {
        // Used to prevent showing the id row
        if (headers.length != 0) {
            let element = $("<th data-type='" + schema[key] + "'>" + key + "</th>");
            element.appendTo(headerRow);
        }
        headers.push(key);
    }

    // Create the form
    for (let i = 1; i < headers.length; i++) {
      let html = "<input type='";
      switch(schema[headers[i]]) {
        case "integer":
          html += "number' step='1"
          break;
        default:
          html += "text";
          break;
      }
      html += "' data-type='" + schema[headers[i]];
      html += "' class='form-control mr-2'\
         id='" + headers[i] + "_field'\
         placeholder='" + headers[i] + "'>";

      $(html).appendTo(form);
    }
    $("<button type='submit' class='btn btn-primary'>Submit</button>").appendTo(form);


    // Populate the cells
    for (let signal of signals) {
        let signalID = headers[0] + "_" + signal[headers[0]];
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
        // create link buttons
        if(typeof(links) != "undefined") {
          Object.keys(links).forEach(key => {
            let link = links[key];
            let params = {};
            Object.keys(link.params).forEach(id => {
              params[link.params[id]] = signal[id];
            })
            let html = "<button class='btn btn-primary ml-2' onclick='loadTable(\""
              + link.query + "\","  + JSON.stringify(params).replace(/\\"/g, '\'')
              + ")'>" + key + "</button>";
            $(html).appendTo(row);
          });
        }
        // create action buttons that perform some sort of "action"
        if(typeof(actions) != "undefined") {
          Object.keys(actions).forEach(key => {
            let action = actions[key];
            let params = {};
            let html = "<button class='btn btn-primary ml-2' onclick='"
              + action + "(this)'>" + key + "</button>";
            $(html).appendTo(row);
          });
        }
        // Add the remove button
        let html = "<button class='btn btn-primary ml-2' onclick='deleteRow(\""
          + name + "\"," + signal[headers[0]] + ")'> X </button>";
        $(html).appendTo(row);

        // On a cell click allow the row to be edited
        row.find("td.edit-cell").click(function (event) {
          editCrudRow(event);
        });
        row.appendTo(tableBody);
    }


    $("#signalTable button").click(function (event) {
        let target = $(event.target);
        let signal_id = target.parent().attr("id");

        // TODO Remove the signal from the db
        console.log(signal_id);
    });
}

// Deselect a row (and possibly edit the content)
function deselectCrudRows(update) {
    // Get all rows
    let rows = $("#ruleTable > tbody > tr");
    for (let i = 0; i < rows.length; i++) {
        let row = $(rows[i]);
        row.removeClass("editing");
        // If the row is being edited
        if (row.attr("id").includes("_edited")) {
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
  $("td.empty", selected_row).html("")
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

    // Flag the row as edited
    selected_row.attr("id", selected_row.attr("id") + "_edited");
    selected_row.addClass("editing");

    // Add a button to submit the changes
    let submit_edit_button = $("<button id='submit_crud_row' class='btn btn-primary ml-2'> ✓ </button>").appendTo(selected_row);

    // When clicked, submit the data and deselect the row
    submit_edit_button.click(function (event) {
        deselectCrudRows(true);
    });

    // Focus on the clicked element
    $(event.target).focus();
  }
}

// update a table using a datastructure that should remain consistent
// JSON object that must include an id
function updateRow(table_name, data, index="id") {
  if(!data["id"]) throw "Updating a row without an ID is not permitted";
  $.ajax({
    type: "POST",
    url: currentURL + "update",
    data: {
      "data": JSON.stringify(data)
      , "table_name": table_name
      , "index": index
    },
    success: function(results) {
      console.log("success");
    }
  });
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
  });
}
