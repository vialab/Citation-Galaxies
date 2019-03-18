$(document).ready(function () {


    /* CRUD processes are not based on search, although a nice touch would be
    having the ability to filter the results
     */


    // On submit for the rule CRUD
    $("#ruleForm").submit(function (event) {
        // Prevent the page from reloading
        event.preventDefault();

        // // Get the input from the form
        // let input = $('#ruleInput').val();

        // // Get the selected value, signal or category
        // let selectedSignal = $("#ruleForm .form-check-input:checked").val();

        // // Change the url we will access based on the checkbox selected
        // let requestUrl = currentURL;
        // if (selectedSignal == "signal") {
        //     requestUrl += "specificSignals";
        // } else if (selectedSignal == "category") {
        //     requestUrl += "specificCategories";
        // }

        // $.ajax({
        //     type: 'POST',
        //     url: requestUrl,
        //     data: { input: input },
        //     success: function (signals) {
        //         let table = $("#ruleTable");
        //         table.children().remove();
        //         // Populate the table
        //         populateTable(signals, table);
        //     }
        // });







    });

});

// clear the form and clear the table of any results
function clearCrudTable() {
    let table = $("#ruleTable");
    let form = $("#ruleForm");
    form.children().remove();
    table.children().remove();
    $("#ruleForm")[0].reset();
}

// load category results from server and populate the results table
function loadCategoryTable() {
    clearCrudTable();
    loadData("categories", function (results) {
        // since we are loading the categories again, may as well update our json
        transformCategoryData(results);
        populateTable(results, $("#ruleTable"));
    });
}

// same as above, but will probably need custom code later on.
function loadSignalTable() {
    clearCrudTable();
    loadData("signals", function (results) {
        // since we are loading the signals again, may as well update our json
        transformSignalData(results);
        populateTable(results, $("#ruleTable"));
    });
}

function populateTable(signals, table) {
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
            let element = $("<th>" + key + "</th>");
            element.appendTo(headerRow);
        }
        headers.push(key);
    }

    // Create the form
    for (let i = 1; i < headers.length; i++) {
        $("<input type='text' class='form-control mr-2'\
           id='" + headers[i] + "_field'\
           placeholder='" + headers[i] + "'>").appendTo(form);
    }
    $("<button type='submit' class='btn btn-primary'>Submit</button>").appendTo(form);


    // Populate the cells
    for (let signal of signals) {
        let signalID = headers[0] + "_" + signal[headers[0]];
        let row = $("<tr id='" + signalID + "'></tr>");

        // For each entry in the json
        for (let i = 1; i < headers.length; i++) {
            $("<td id='" + headers[i] + "'>" + signal[headers[i]] + "</td>").appendTo(row);
        }

        // Add the remove button
        $("<button class='btn btn-primary ml-2'> X </button>").appendTo(row);

        // On a cell click allow the row to be edited
        row.find("td").click(function (event) {
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

        // If the row is being edited
        if (row.attr("id").includes("_edited")) {
            let row_elements = row.children();

            for (let i = 0; i < row_elements.length; i++) {
                let row_element = $(row_elements[i]);

                // Revert all TD's back to their original values
                // or update them
                if (row_element.prop("tagName") == "TD") {
                    let row_element_id = row_element.attr("id").split("original=")[0];

                    if (!update) {
                        let row_element_val = row_element.attr("id").split("original=")[1];
                        row_element.text(row_element_val);
                    }

                    row_element.attr("id", row_element_id);
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
            let row_element_id = row_element.attr("id") + "original=" + row_element_value;
            row_element.attr("id", row_element_id);

            // Allow the cell to be edited
            row_element.attr('contenteditable', 'true');
        }

        // Flag the row as edited
        selected_row.attr("id", selected_row.attr("id") + "_edited");

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
function updateRow(data) {
  if(!data["id"]) throw "Updating a row without an ID is not permitted";
  $.ajax({
    type: "POST",
    url: currentURL + "update",
    data: {
      "data": JSON.stringify(data)
      , "table_name": data
    },
    success: function(results) {
      callback(results);
    },
    async: _async
  });
}
