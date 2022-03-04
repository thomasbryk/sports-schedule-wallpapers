var wallpapersJson;

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
    PopulateStyles();
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

    $month.attr("disabled", true);
    $month.parent().addClass("disabled");
    $style.attr("disabled", true);
    $style.parent().addClass("disabled");
    $timeZone.attr("disabled", true);
    $timeZone.parent().addClass("disabled");
    $amoled.attr("disabled", true);
    $amoled.parent().addClass("disabled");

    $wallpaperDownload.parent().addClass("disabled");

    $logo.val('home');
    CheckWallpaper();
    return;
}

function SetWallpaper(logo, style = null) {
    var $wallpaper = $("#wallpaper");
    var $wallpaperDownload = $("#wallpaperDownload");

    var $amoled = $("#amoled");
    var amoled = $amoled.prop('checked');

    let imgUrl = "";

    switch (style != null) {
        case false:
            imgUrl = (amoled) ?
                wallpapersJson.teams.leafs.currentMonth[logo].amoled :
                wallpapersJson.teams.leafs.currentMonth[logo].default;
            break;
        case true:
            imgUrl = wallpapersJson.teams.leafs.currentMonth[logo][style];
            if (typeof imgUrl !== 'string') {
                imgUrl = (amoled) ?
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

    if (style_Val == '') {
        SetWallpaper(logo_Val);
        return;
    }

    //$timeZone.attr("disabled", false);
    //$timeZone.parent().removeClass("disabled");

    if (timeZone_Val == '') {
        SetWallpaper(logo_Val, style_Val);
    }
}

function PopulateStyles() {
    var $style = $("#Style");

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
    var hasStyle = (style != '');
    var hasTimeZone = (timeZone != '');

    let imgUrl = null;

    switch (hasStyle) {
        case false:
            imgUrl = wallpapersJson.teams.leafs.currentMonth[logo].amoled;
            break;
        case true:
            imgUrl = wallpapersJson.teams.leafs.currentMonth[logo][style].amoled;
            break;
    }

    return imgUrl;
}