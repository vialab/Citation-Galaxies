// Trigger action when the contexmenu is about to be shown
$(document).bind("mouseup", function (event) {
  // if where is clicked is not the menu, hide the menu
  if($(".custom-menu").is(":visible")) {
    if(!$(event.target).parents(".custom-menu").length > 0) {
      $(".custom-menu").hide(100);
    }
  }
  // Avoid the real one
  let sel = window.getSelection();
  if(sel.toString() == "") {

  } else {
    $(".custom-menu").finish().toggle(100).css({
        top: event.pageY + "px",
        left: event.pageX + "px"
    });
  }
});
