class Table {
  /**
   * @param {Number} columns - number of columns, rows not specified due to expanding table feature
   * @param {Element} parent - dom element to append table to
   * @param {string} tableName - table name should be unique
   */
  constructor(columns, parent, tableName) {
    this.columns = columns;
    this.parent = parent;
    this.name = tableName;
    this.columnsContent = new Array(this.columns);
    this.numRows = 0;
  }
  /**
   *
   * @param {Array.<string>} names
   */
  setHeaderNames(names) {
    if (names.length != this.columns) {
      console.error(
        `Incorrect number of names being passed into header. Expected ${this.columns} got ${names.length}`
      );
    }
    this.HeaderNames = names;
  }
  /**
   * @param {Number} columnNumber - columns start at 0
   * @param {string} innerHtml - html you want in the cell
   */
  setColumnsContent(columnNumber, innerHtml) {
    if (columnNumber > this.columns || columnNumber < 0) {
      console.error(
        `Error setting column's content. Column supplied ${columnNumber} must be > 0 and < ${this.columns}`
      );
    }

    this.columnsContent[columnNumber] = innerHtml;
  }
  /**
   * @returns {string}
   */
  createRow() {
    //create row
    let content = `<div class="row" id="${this.name}-row${this.numRows}">`;
    //create columns in row
    for (let i = 0; i < this.columns; ++i) {
      content += `<div class="col-sm" id="col${i}-row${this.numRows}">`;
      //insert column content
      content += this.columnsContent[i];
      content += "</div>";
    }
    //end row
    content += "</div>";
    this.numRows++; //increment number of rows
    return content;
  }

  //must have called setHeaderNames and setColumnsContent first
  appendTableToDom() {
    let colClass = "col-sm";
    const defaultStyle = "background-color:#dee2e6; outline:1px thin black;";
    let content = `<div class="container" id=${this.name}>
        <div class="row" id=${this.name + "-" + "header"}>`;
    if (this.HeaderNames != null) {
      for (let i = 0; i < this.columns; ++i) {
        content += `<div class="${colClass} table-header" style=${defaultStyle}><p align="center">${this.HeaderNames[i]}</p></div>`;
      }
    } else {
      for (let i = 0; i < this.columns; ++i) {
        content += `<div class="${colClass} table-header" style=${defaultStyle}><p align="center">"NO_NAME"</p></div>`;
      }
    }
    //closing tag
    content += `</div><div class="${colClass} table-header" style=${defaultStyle} id=${this.name}-append><p align="center">+</p></div></div>`;
    $(this.parent).append(content);
    $("#" + this.name + "-append").on("click", this.expand.bind(this));
  }
  /**
   * table must exist in dom
   * @param {Number} row - does not include header row, eg. row 0 is the first row after header row
   * @param {Number} column - between 0 and number of columns in table
   * @return {Element}
   */
  getCell(row, column) {
    if (!$("#" + this.name).length) {
      console.error(
        "Table does not exist. Table must be appended to Dom before getCell is called"
      );
    }
    if (row > 0 && row <= this.numRows && column > 0 && column < this.columns) {
      return $("#" + this.name).find(`col${column}-row${row}`);
    }
    console.error("Error row or column outside of what exists.");
  }
  //callback for expanding the table
  expand() {
    //inserts row before the append div
    $(this.createRow()).insertBefore("#" + this.name + "-append");
  }
  //removes from dom
  remove() {
    if ($("#" + this.name).length) {
      $("#" + this.name).remove();
    }
  }
}
