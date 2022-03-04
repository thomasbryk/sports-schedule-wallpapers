var wallpapersJson, selectedTeamCode;

$(document).ready(function() {
    var $wallpaper = $("#wallpaper");
    $wallpaper.hide();

    onload();
});

function onload() {

    fetch("assets/wallpapers.json")
        .then(response => response.json())
        .then(json => wallpapersJson = json)
        .then(PostJsonRetrieval);
}

function PostJsonRetrieval() {
    ResetWallpaper();
}

function ResetWallpaper() {
    var $wallpaper = $("#wallpaper");
    var $logo = $("#Logo");
    var $month = $("#Month");
    var $style = $("#Style");
    var $timeZone = $("#TimeZone");
    var $amoled = $("#amoled");
    var $wallpaperDownload = $("#wallpaperDownload");

    $wallpaper.attr('src', '');
    $logo.val('');
    $month.val('');
    $style.val('');
    $timeZone.val('');
    $amoled.prop('checked', false);

    $logo.attr("disabled", true);
    $logo.parent().addClass("disabled");
    $month.attr("disabled", true);
    $month.parent().addClass("disabled");
    $style.attr("disabled", true);
    $style.parent().addClass("disabled");
    $timeZone.attr("disabled", true);
    $timeZone.parent().addClass("disabled");
    $amoled.attr("disabled", true);
    $amoled.parent().addClass("disabled");

    $wallpaperDownload.parent().addClass("disabled");
}

function SetWallpaper(logo, style = null) {
    var $wallpaper = $("#wallpaper");
    var $wallpaperDownload = $("#wallpaperDownload");

    var $amoled = $("#amoled");
    var amoled = $amoled.prop('checked');

    let imgUrl = selectedTeamCode + "/";

    switch (style != null) {
        case false:
            imgUrl += (amoled) ?
                wallpapersJson.teams[selectedTeamCode].currentMonth[logo].amoled :
                wallpapersJson.teams[selectedTeamCode].currentMonth[logo].default;
            break;
        case true:
            let imgUrlStyle = wallpapersJson.teams[selectedTeamCode].currentMonth[logo][style];
            console.log(imgUrlStyle);
            if (imgUrlStyle != null) {
                imgUrl += "CurrentMonth/";
                imgUrl += (amoled) ?
                    imgUrlStyle.amoled :
                    imgUrlStyle.default;
            } else {
                imgUrl += (amoled) ?
                    imgUrl.amoled :
                    imgUrl.default;
            }
            break;
    }

    $wallpaper.attr('src', "wallpapers/" + imgUrl);
    $wallpaperDownload.attr('href', "wallpapers/" + imgUrl);
    $wallpaperDownload.parent().removeClass("disabled");

    $wallpaper.fadeIn();
}

function CheckWallpaper() {
    var $logo = $("#Logo");
    var logo_Val = $logo.val();

    if (selectedTeamCode != null) {
        $logo.attr("disabled", false);
        $logo.parent().removeClass("disabled");
    }

    if (!logo_Val)
        return;

    var $style = $("#Style");
    var style_Val = $style.val();

    var $timeZone = $("#TimeZone");
    var timeZone_Val = $timeZone.val();

    var $amoled = $("#amoled");

    let hasAmoled = HasAmoled(logo_Val, style_Val, timeZone_Val);

    $amoled.attr("disabled", !hasAmoled);
    if (hasAmoled)
        $amoled.parent().removeClass("disabled");
    else {
        $amoled.parent().addClass("disabled");
        $amoled.prop('checked', false);
    }


    $style.attr("disabled", false);
    $style.parent().removeClass("disabled");

    if (!style_Val || style_Val == '') {
        $timeZone.val('');
        SetWallpaper(logo_Val);
        return;
    }

    $timeZone.val('2');
    //$timeZone.attr("disabled", false);
    //$timeZone.parent().removeClass("disabled");

    //if (timeZone_Val == '') {
    SetWallpaper(logo_Val, style_Val);
    //}
}

function PopulateLogos() {
    var $logo = $("#Logo");
    $logo.empty();

    let keys = Object.keys(wallpapersJson.teams[selectedTeamCode].currentMonth)
    let labels = Object.values(wallpapersJson.teams[selectedTeamCode].currentMonth);

    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let label = labels[i].label;
        $logo.append(new Option(label, key));
    }

    PopulateStyles();
}

function PopulateStyles() {
    var $style = $("#Style");

    $style.empty();
    $style.append(new Option());

    for (let style of wallpapersJson.styles) {
        let key = Object.keys(style)[0];
        let label = Object.values(style)[0];
        $style.append(new Option(label, key));
    }
}

function HasAmoled(logo, style = '', timeZone = '') {
    let imgUrl = GetAmoled(logo, style, timeZone);

    return (imgUrl != null);
}

function GetAmoled(logo, style = null, timeZone = null) {
    var hasStyle = (style != null && style !== '')
    var hasTimeZone = (timeZone != null && timeZone != '');

    let imgUrl;
    switch (hasStyle) {
        case false:
            imgUrl = wallpapersJson.teams[selectedTeamCode].currentMonth[logo].amoled;
            break;
        case true:
            imgUrl = wallpapersJson.teams[selectedTeamCode].currentMonth[logo][style].amoled;
            break;
    }

    if (imgUrl != null)
        imgUrl = selectedTeamCode + "/" + imgUrl

    return imgUrl;
}

function TeamSelected(element) {
    let resetWallpaper = (selectedTeamCode != null)

    selectedTeamCode = element.id;

    PopulateLogos();

    if (resetWallpaper)
        ResetWallpaper();

    CheckWallpaper();

    var $selectTeamError = $("#selectTeamError");
    $selectTeamError.fadeOut();

    var wallpaperEditor = $("#wallpaper-editor");
    $('html,body').animate({ scrollTop: wallpaperEditor.offset().top }, 'slow');
}