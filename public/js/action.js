// find similar words using getSimilarWords
function findSimilar(elem) {
  let $elem = $(elem).parent();
  let signal = $("#signal", $elem).html();
  getSimilarWords(signal, function(results) {
    console.log(results);
  });
}
