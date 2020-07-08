/**
 * Everything that needs to switch
 */
const DB = {
  Pubmed: {
    searchRangeIndicator: "display:none;",
    rangeIconSrc: "",
    ruleSource: (beforeRangeVal, afterRangeVal, existing) => {
      return `<ul class="list-inline">
    <li class="list-inline-item col-2 m-0 p-0" style="width:23%;">
      <input type="range" innertext="0" min="0" max="9" value="${beforeRangeVal}" step="1" class="form-control-range slider" id="rangeBefore_sig_${existing}"
        oninput="updateTextInput(document.getElementById('citationRange_sig_${existing}'), document.getElementById('rangeBefore_sig_${existing}'), document.getElementById('rangeAfter_sig_${existing}'), '', 1);">
    </li>
    <li class="list-inline-item align-middle m-0 p-0">
      <label class="text-center align-middle p-0" for="formControlRange" style="margin: 0 auto 10px auto; width:158px" id="citationRange_sig_${existing}">
      <p id="left-range" style="display: inline;">[ ${
        $("#rangeBefore").attr("max") - beforeRangeVal
      } </p><img src="arrow.png" style="transform:scaleX(-1);" class="citation-arrow"></img> <img src="quotes_ui.png" class="citation-quote"></img> <img src="arrow.png" class="citation-arrow"></img><p id="right-range" style="display:inline;"> ${afterRangeVal} ]</p>
      </label>
    </li>
    <li class="list-inline-item m-0 p-0" style="width:23%;">
      <input type="range" innertext="0" min="0" max="9" value="${afterRangeVal}" step="1" class="form-control-range slider" id="rangeAfter_sig_${existing}"
        oninput="updateTextInput(document.getElementById('citationRange_sig_${existing}'), document.getElementById('rangeBefore_sig_${existing}') , document.getElementById('rangeAfter_sig_${existing}'), '', 1);">
    </li>
  </ul>`;
    },
    isPubmed: true,
    ruleIndex: 1,
  },
  Erudit: {
    searchRangeIndicator: "display:block;",
    rangeIconSrc: "quotes_ui.png",
    ruleSource: () => {
      return "";
    },
    isPubmed: false,
    ruleIndex: 0,
  },
};

let CURRENT_DATABASE = DB.Pubmed;
