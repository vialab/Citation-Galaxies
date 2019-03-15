$(document).ready(function () {


  /* CRUD processes are not based on search, although a nice touch would be
  having the ability to filter the results
   */


    // On submit for the rule CRUD
    $("#ruleForm").submit(function (event) {
        // Prevent the page from reloading
        event.preventDefault();

        // Get the input from the form
        let input = $('#ruleInput').val();

        // Get the selected value, signal or category
        let selectedSignal = $("#ruleForm .form-check-input:checked").val();

        // Change the url we will access based on the checkbox selected
        let requestUrl = currentURL;
        if (selectedSignal == "signal") {
            requestUrl += "specificSignals";
        } else if (selectedSignal == "category") {
            requestUrl += "specificCategories";
        }

        $.ajax({
            type: 'POST',
            url: requestUrl,
            data: { input: input },
            success: function (signals) {
                let table = $("#ruleTable");
                table.children().remove();
                // Populate the table
                populateTable(signals, table);
            }
        });
    });

});

// clear the form and clear the table of any results
function clearCrudTable() {
  let table = $("#ruleTable");
  table.children().remove();
  $("#ruleForm")[0].reset();
}

// load category results from server and populate the results table
function loadCategoryTable() {
  clearCrudTable();
  loadData("categories", function(results) {
    // since we are loading the categories again, may as well update our json
    transformCategoryData(results);
    populateTable(results, table);
  });
}

// same as above, but will probably need custom code later on.
function loadSignalTable() {
  clearCrudTable();
  loadData("signals", function(results) {
    // since we are loading the signals again, may as well update our json
    transformSignalData(results);
    populateTable(results, table);
  });
}

function populateTable(signals, table) {
    // Create the header row
    let tableHeader = $("<thead></thead>").appendTo(table);
    let headerRow = $("<tr></tr>").appendTo(tableHeader);

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


    // Populate the cells
    for (let signal of signals) {
        let signalID = headers[0] + "_" + signal[headers[0]];
        let row = $("<tr id='" + signalID + "'></tr>");

        // For each entry in the json
        for (let i = 1; i < headers.length; i++) {
            $("<td id='" + headers[i] + "'>" + signal[headers[i]] + "</td>").appendTo(row);
        }

        $("<button class='btn btn-primary ml-2'> X </button>").appendTo(row);
        row.appendTo(table);
    }


    $("#signalTable button").click(function (event) {
        let target = $(event.target);
        let signal_id = target.parent().attr("id");

        // TODO Remove the signal from the db
        console.log(signal_id);
    });
}
